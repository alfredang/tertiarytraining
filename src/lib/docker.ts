/**
 * DockerService — abstracts container lifecycle.
 *
 * Modes (set via DOCKER_HOST_MODE env var):
 *   - "mock"      (default): no daemon needed; simulates lifecycle, returns mock URLs.
 *   - "dockerode" (real)   : controls the host Docker daemon via /var/run/docker.sock.
 *                             Requires the socket to be bind-mounted into the app
 *                             container, and the `app` user to be in the docker group.
 */

import Docker from "dockerode";

export type RunResult = { containerUrl: string };

export type WpContainerInfo = {
  /** Display name in our DB, e.g. "WP Demo 1" */
  displayName: string;
  /** Docker container hosting WordPress, e.g. "wordpress-demo1-wordpress-1" */
  wpContainer: string;
  /** Docker container hosting MariaDB, e.g. "wordpress-demo1-db-1" */
  dbContainer: string;
  /** Path inside the app container to the golden SQL snapshot (bind-mounted from host) */
  goldenSqlPath: string;
  /** Public access URL (we return this unchanged after a soft reset) */
  containerUrl: string;
};

export interface DockerService {
  stopAndRemove(name: string): Promise<void>;
  run(image: string, name: string, port: number, env?: string[]): Promise<RunResult>;
  /** Optional — present in dockerode mode only. Restores the WP DB from a golden snapshot. */
  softResetWp?(info: WpContainerInfo): Promise<RunResult>;
}

// ============================================================================
// Mock — default. Simulates lifecycle, doesn't touch real containers.
// ============================================================================
class MockDockerService implements DockerService {
  async stopAndRemove(name: string): Promise<void> {
    console.log(`[docker:mock] stop+remove ${name}`);
  }
  async run(image: string, name: string, port: number, env?: string[]): Promise<RunResult> {
    console.log(`[docker:mock] run ${image} as ${name} on :${port}${env?.length ? ` env=${env.join(",")}` : ""}`);
    const base = process.env.PUBLIC_BASE_URL ?? "http://localhost";
    const token = Math.random().toString(36).slice(2, 8);
    return { containerUrl: `${base.replace(/\/$/, "")}:${port}/?s=${token}` };
  }
  async softResetWp(info: WpContainerInfo): Promise<RunResult> {
    console.log(`[docker:mock] soft-reset ${info.wpContainer} from ${info.goldenSqlPath}`);
    return { containerUrl: info.containerUrl };
  }
}

// ============================================================================
// Dockerode — real Docker control via /var/run/docker.sock.
// ============================================================================
class DockerodeService implements DockerService {
  private docker = new Docker({ socketPath: "/var/run/docker.sock" });

  async stopAndRemove(name: string): Promise<void> {
    try {
      const c = this.docker.getContainer(name);
      await c.stop({ t: 10 }).catch(() => {});
      await c.remove({ force: true }).catch(() => {});
    } catch (err) {
      console.warn(`[docker:dockerode] stopAndRemove ${name} failed`, err);
    }
  }

  async run(image: string, name: string, port: number, env?: string[]): Promise<RunResult> {
    // Pull only if the image isn't already present locally (custom-built
    // images like tertiary-ubuntu:latest wouldn't be on the registry).
    try {
      await this.docker.getImage(image).inspect();
    } catch {
      await new Promise<void>((resolve, reject) => {
        this.docker.pull(image, (err: Error | null, stream: NodeJS.ReadableStream) => {
          if (err) return reject(err);
          this.docker.modem.followProgress(stream, (e: Error | null) => (e ? reject(e) : resolve()));
        });
      });
    }

    const container = await this.docker.createContainer({
      Image: image,
      name,
      Env: env,
      ExposedPorts: { [`${port}/tcp`]: {} },
      HostConfig: {
        PortBindings: { [`${port}/tcp`]: [{ HostPort: String(port) }] },
        RestartPolicy: { Name: "unless-stopped" },
      },
    });
    await container.start();

    // For containers whose internal port matches the host port (the
    // pattern this app uses), just point the URL at host:port.
    const host = process.env.PUBLIC_HOST_IP ?? process.env.PUBLIC_BASE_URL?.replace(/^https?:\/\//, "").replace(/\/.*$/, "") ?? "localhost";
    return { containerUrl: `http://${host}:${port}/` };
  }

  /**
   * Soft-reset a WordPress demo: leaves the container running, wipes the DB,
   * and restores from the golden SQL snapshot — preserving credentials and
   * sample state without restarting the container.
   */
  async softResetWp(info: WpContainerInfo): Promise<RunResult> {
    const dbContainer = this.docker.getContainer(info.dbContainer);

    // Discover credentials + DB name from the DB container's env.
    // Try MARIADB_* first (modern MariaDB images), fall back to MYSQL_*.
    const inspect = await dbContainer.inspect();
    const env = inspect.Config?.Env ?? [];
    const envMap: Record<string, string> = {};
    for (const e of env) {
      const idx = e.indexOf("=");
      if (idx > 0) envMap[e.slice(0, idx)] = e.slice(idx + 1);
    }
    const rootPw = envMap.MARIADB_ROOT_PASSWORD ?? envMap.MYSQL_ROOT_PASSWORD;
    if (!rootPw)
      throw new Error(`No root password env var on ${info.dbContainer} (tried MARIADB_ROOT_PASSWORD, MYSQL_ROOT_PASSWORD)`);
    const dbName = envMap.MARIADB_DATABASE ?? envMap.MYSQL_DATABASE ?? "wordpress";

    // The golden SQL file is bind-mounted into THIS app container at info.goldenSqlPath.
    // We need it accessible inside the DB container. Two ways:
    //   (a) Copy via docker.putArchive into a temp path in the DB container, then mysql < it
    //   (b) Have the host bind-mount the same dir into the DB container — not the case here
    // Path (a): read the SQL bytes from our filesystem, tar them up, putArchive into /tmp/restore.sql
    const fs = await import("node:fs/promises");
    const sql = await fs.readFile(info.goldenSqlPath);
    const tar = await import("tar-stream");
    const pack = tar.pack();
    pack.entry({ name: "restore.sql" }, sql);
    pack.finalize();
    const chunks: Buffer[] = [];
    for await (const chunk of pack as unknown as AsyncIterable<Buffer>) chunks.push(chunk);
    const tarBuf = Buffer.concat(chunks);
    await dbContainer.putArchive(tarBuf, { path: "/tmp" });

    // Drop & recreate the per-demo DB, then restore from /tmp/restore.sql
    const exec = await dbContainer.exec({
      Cmd: [
        "sh",
        "-c",
        `mariadb -u root -p"${rootPw}" -e "DROP DATABASE IF EXISTS \\\`${dbName}\\\`; CREATE DATABASE \\\`${dbName}\\\`;" && ` +
          `mariadb -u root -p"${rootPw}" "${dbName}" < /tmp/restore.sql && rm -f /tmp/restore.sql`,
      ],
      AttachStdout: true,
      AttachStderr: true,
    });
    const stream = await exec.start({ hijack: true, stdin: false });
    await new Promise<void>((resolve, reject) => {
      stream.on("end", resolve);
      stream.on("error", reject);
      stream.resume();
    });
    const result = await exec.inspect();
    if (result.ExitCode !== 0)
      throw new Error(`mariadb restore exited ${result.ExitCode}`);

    // WP container is unchanged, URL stays the same.
    return { containerUrl: info.containerUrl };
  }
}

// ============================================================================
let _service: DockerService | null = null;
export function dockerService(): DockerService {
  if (_service) return _service;
  const mode = (process.env.DOCKER_HOST_MODE ?? "mock").toLowerCase();
  if (mode === "dockerode") {
    try {
      _service = new DockerodeService();
      console.log("[docker] using DockerodeService");
    } catch (err) {
      console.error("[docker] failed to init DockerodeService, falling back to mock", err);
      _service = new MockDockerService();
    }
  } else {
    _service = new MockDockerService();
  }
  return _service;
}

/**
 * Map an internal DockerContainer (DB row) to the actual host docker
 * container names + golden snapshot path for soft-reset.
 *
 * Currently hard-coded to the Tertiary Training WordPress demo layout:
 *   - environment.name === "WordPress"
 *   - port range 8081..8085 → wordpress-demo{1..5}-{wordpress,db}-1
 */
export function wpSoftResetTarget(args: {
  environmentName: string;
  port: number;
  containerUrl: string;
  displayName: string;
}): WpContainerInfo | null {
  if (args.environmentName !== "WordPress") return null;
  const n = args.port - 8080;
  if (n < 1 || n > 5) return null;
  return {
    displayName: args.displayName,
    wpContainer: `wordpress-demo${n}-wordpress-1`,
    dbContainer: `wordpress-demo${n}-db-1`,
    goldenSqlPath: `/opt/tertiarytraining/wp-golden/demo-${n}.sql`,
    containerUrl: args.containerUrl,
  };
}

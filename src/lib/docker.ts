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

export type RunOptions = {
  /** Env vars to pass to the container, e.g. ["PORT=8091"] */
  env?: string[];
  /** Port the process inside the container listens on. Defaults to `port`. */
  internalPort?: number;
};

export interface DockerService {
  stopAndRemove(name: string): Promise<void>;
  run(image: string, name: string, port: number, opts?: RunOptions): Promise<RunResult>;
  /** Start an already-existing stopped container by name. */
  start(name: string): Promise<void>;
  /** Stop a running container by name (preserves data; not destructive). */
  stop(name: string): Promise<void>;
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
  async run(image: string, name: string, port: number, opts?: RunOptions): Promise<RunResult> {
    console.log(
      `[docker:mock] run ${image} as ${name} on :${port}` +
        (opts?.internalPort ? ` (internal :${opts.internalPort})` : "") +
        (opts?.env?.length ? ` env=${opts.env.join(",")}` : ""),
    );
    const base = process.env.PUBLIC_BASE_URL ?? "http://localhost";
    const token = Math.random().toString(36).slice(2, 8);
    return { containerUrl: `${base.replace(/\/$/, "")}:${port}/?s=${token}` };
  }
  async softResetWp(info: WpContainerInfo): Promise<RunResult> {
    console.log(`[docker:mock] soft-reset ${info.wpContainer} from ${info.goldenSqlPath}`);
    return { containerUrl: info.containerUrl };
  }
  async start(name: string): Promise<void> {
    console.log(`[docker:mock] start ${name}`);
  }
  async stop(name: string): Promise<void> {
    console.log(`[docker:mock] stop ${name}`);
  }
}

// ============================================================================
// Dockerode — real Docker control via /var/run/docker.sock.
// ============================================================================
class DockerodeService implements DockerService {
  private docker: Docker;
  
  constructor(client?: Docker) {
    this.docker = client || new Docker({ socketPath: "/var/run/docker.sock" });
  }

  async stopAndRemove(name: string): Promise<void> {
    try {
      const c = this.docker.getContainer(name);
      await c.stop({ t: 10 }).catch(() => {});
      await c.remove({ force: true }).catch(() => {});
    } catch (err) {
      console.warn(`[docker:dockerode] stopAndRemove ${name} failed`, err);
    }
  }

  async start(name: string): Promise<void> {
    const c = this.docker.getContainer(name);
    try {
      await c.start();
    } catch (err) {
      const e = err as { statusCode?: number };
      // 304 = already started; treat as success
      if (e.statusCode !== 304) throw err;
    }
  }

  async stop(name: string): Promise<void> {
    const c = this.docker.getContainer(name);
    try {
      await c.stop({ t: 10 });
    } catch (err) {
      const e = err as { statusCode?: number };
      // 304 = already stopped; treat as success
      if (e.statusCode !== 304) throw err;
    }
  }

  async run(image: string, name: string, port: number, opts?: RunOptions): Promise<RunResult> {
    const internalPort = opts?.internalPort ?? port;
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
      Env: opts?.env,
      ExposedPorts: { [`${internalPort}/tcp`]: {} },
      HostConfig: {
        PortBindings: { [`${internalPort}/tcp`]: [{ HostPort: String(port) }] },
        RestartPolicy: { Name: "unless-stopped" },
      },
    });
    await container.start();

    const host = process.env.PUBLIC_HOST_IP ?? process.env.PUBLIC_BASE_URL?.replace(/^https?:\/\//, "").replace(/\/.*$/, "") ?? "localhost";
    return { containerUrl: `http://${host}:${port}/` };
  }

  async softResetWp(info: WpContainerInfo): Promise<RunResult> {
    const dbContainer = this.docker.getContainer(info.dbContainer);

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

    return { containerUrl: info.containerUrl };
  }
}

// ============================================================================
// Dual Router — sends Ubuntu to remote, everything else to local
// ============================================================================
class DualDockerService implements DockerService {
  private local = new DockerodeService();
  private remote: DockerodeService | null = null;

  constructor() {
    const host = process.env.REMOTE_DOCKER_HOST;
    if (host) {
      const port = Number(process.env.REMOTE_DOCKER_PORT || 2375);
      // Construct URL appropriately for Dockerode
      const isUrl = host.startsWith("http") || host.startsWith("tcp");
      const remoteClient = new Docker(isUrl ? { host, port } : { host: `http://${host}`, port });
      this.remote = new DockerodeService(remoteClient);
      console.log(`[docker] initialized Remote Docker engine at ${host}:${port} for Ubuntu containers`);
    }
  }

  private isRemote(name: string): boolean {
    return name.toLowerCase().includes("ubuntu");
  }

  private getService(name: string): DockerService {
    if (this.isRemote(name)) {
      if (!this.remote) {
        console.warn(`[docker] WARNING: Ubuntu container requested but REMOTE_DOCKER_HOST is not set. Falling back to local Docker engine.`);
        return this.local;
      }
      return this.remote;
    }
    return this.local;
  }

  async stopAndRemove(name: string): Promise<void> { return this.getService(name).stopAndRemove(name); }
  async start(name: string): Promise<void> { return this.getService(name).start(name); }
  async stop(name: string): Promise<void> { return this.getService(name).stop(name); }
  
  async run(image: string, name: string, port: number, opts?: RunOptions): Promise<RunResult> {
    return this.getService(name).run(image, name, port, opts);
  }
}

// ============================================================================
let _service: DockerService | null = null;
export function dockerService(): DockerService {
  if (_service) return _service;
  const mode = (process.env.DOCKER_HOST_MODE ?? "mock").toLowerCase();
  if (mode === "dockerode") {
    try {
      _service = new DualDockerService();
      console.log("[docker] using DualDockerService (Dockerode)");
    } catch (err) {
      console.error("[docker] failed to init DualDockerService, falling back to mock", err);
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

/**
 * Return the list of *host* docker container names that need to be
 * started/stopped together for a given DockerContainer row.
 *
 * - WordPress: wp + db pair
 * - Ubuntu / Kali Linux: single container matching the display name pattern
 */
export function hostContainerNamesFor(args: {
  environmentName: string;
  port: number;
}): string[] {
  if (args.environmentName === "WordPress") {
    const n = args.port - 8080;
    if (n < 1 || n > 5) return [];
    return [`wordpress-demo${n}-wordpress-1`, `wordpress-demo${n}-db-1`];
  }
  if (args.environmentName === "Ubuntu") {
    const n = args.port - 8090;
    if (n < 1 || n > 5) return [];
    return [`ubuntu-demo${n}`];
  }
  if (args.environmentName === "Kali Linux") {
    const n = args.port - 8095;
    if (n < 1 || n > 5) return [];
    return [`kali-demo${n}`];
  }
  return [];
}

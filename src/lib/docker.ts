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

// Mock-mode chatter is useful in dev but pure noise in prod logs.
const mockLog: (...args: unknown[]) => void =
  process.env.NODE_ENV === "production" ? () => {} : console.log;

export type RunResult = { containerUrl: string };

/**
 * Lab credentials + image config for on-demand WordPress provisioning.
 *
 * Each spawned lab is ephemeral and self-contained — the db + wp containers are
 * created together with these creds and destroyed on Stop — so the password
 * only needs to be internally consistent, never secret. The defaults below are
 * non-production placeholders; set the env vars in Coolify to override.
 */
const LAB = {
  wpImage: process.env.WP_IMAGE ?? "wordpress:latest",
  dbImage: process.env.WP_DB_IMAGE ?? "mariadb:11",
  dbUser: process.env.WP_DB_USER ?? "wpuser",
  dbPassword: process.env.WP_DB_PASSWORD ?? "wp_lab_pw",
  dbRootPassword: process.env.WP_DB_ROOT_PASSWORD ?? "wp_lab_root_pw",
  goldenDir: process.env.WP_GOLDEN_DIR ?? "/opt/tertiarytraining/wp-golden",
};

/** Describes the lab a DockerContainer row maps to, for spawn/destroy. */
export type LabSpec = {
  environmentName: string;
  /** Environment.dockerImage — used for non-WordPress single-container labs. */
  image: string;
  /** DockerContainer.name (display / fallback container name). */
  name: string;
  /** Host port (also the WordPress slot key: 8080 + slot). */
  port: number;
};

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
  /**
   * On-demand lifecycle: create a fresh container (or wp+db pair) from scratch,
   * always pulling the latest image. For WordPress, the DB is restored to a
   * clean golden snapshot so every start is a pristine lab. Returns the URL.
   */
  spawnLab(spec: LabSpec): Promise<RunResult>;
  /**
   * On-demand lifecycle: destroy the lab's container(s) + network + anonymous
   * volumes entirely, so a stopped lab consumes zero memory and leaves nothing
   * behind. Idempotent.
   */
  destroyLab(spec: LabSpec): Promise<void>;
}

/** WordPress slot (1..5) for a given environment + host port, or null. */
export function wpSlot(environmentName: string, port: number): number | null {
  if (environmentName !== "WordPress") return null;
  const n = port - 8080;
  return n >= 1 && n <= 5 ? n : null;
}

// ============================================================================
// Mock — default. Simulates lifecycle, doesn't touch real containers.
// ============================================================================
class MockDockerService implements DockerService {
  async stopAndRemove(name: string): Promise<void> {
    mockLog(`[docker:mock] stop+remove ${name}`);
  }
  async run(image: string, name: string, port: number, opts?: RunOptions): Promise<RunResult> {
    mockLog(
      `[docker:mock] run ${image} as ${name} on :${port}` +
        (opts?.internalPort ? ` (internal :${opts.internalPort})` : "") +
        (opts?.env?.length ? ` env=${opts.env.join(",")}` : ""),
    );
    const base = process.env.PUBLIC_BASE_URL ?? "http://localhost";
    const token = Math.random().toString(36).slice(2, 8);
    return { containerUrl: `${base.replace(/\/$/, "")}:${port}/?s=${token}` };
  }
  async softResetWp(info: WpContainerInfo): Promise<RunResult> {
    mockLog(`[docker:mock] soft-reset ${info.wpContainer} from ${info.goldenSqlPath}`);
    return { containerUrl: info.containerUrl };
  }
  async start(name: string): Promise<void> {
    mockLog(`[docker:mock] start ${name}`);
  }
  async stop(name: string): Promise<void> {
    mockLog(`[docker:mock] stop ${name}`);
  }
  async spawnLab(spec: LabSpec): Promise<RunResult> {
    mockLog(`[docker:mock] spawnLab ${spec.environmentName} (${spec.name}) on :${spec.port}`);
    const base = process.env.PUBLIC_BASE_URL ?? "http://localhost";
    return { containerUrl: `${base.replace(/\/$/, "")}:${spec.port}/` };
  }
  async destroyLab(spec: LabSpec): Promise<void> {
    mockLog(`[docker:mock] destroyLab ${spec.environmentName} (${spec.name}) on :${spec.port}`);
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

  /**
   * Always pull the latest image. If the pull fails (e.g. a custom-built image
   * that isn't on a registry) we fall back to the local copy if one exists,
   * otherwise we surface the error.
   */
  private async pullLatest(image: string): Promise<void> {
    try {
      await new Promise<void>((resolve, reject) => {
        this.docker.pull(image, (err: Error | null, stream: NodeJS.ReadableStream) => {
          if (err) return reject(err);
          this.docker.modem.followProgress(stream, (e: Error | null) => (e ? reject(e) : resolve()));
        });
      });
    } catch (err) {
      // No registry copy — only proceed if the image is already present locally.
      try {
        await this.docker.getImage(image).inspect();
        console.warn(`[docker:dockerode] pull ${image} failed, using local copy`, err);
      } catch {
        throw new Error(`Image ${image} could not be pulled and is not present locally`);
      }
    }
  }

  async run(image: string, name: string, port: number, opts?: RunOptions): Promise<RunResult> {
    const internalPort = opts?.internalPort ?? port;
    await this.pullLatest(image);

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

    return { containerUrl: this.hostUrl(port) };
  }

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

    await this.restoreSqlIntoDb(info.dbContainer, dbName, rootPw, info.goldenSqlPath);

    // WP container is unchanged, URL stays the same.
    return { containerUrl: info.containerUrl };
  }

  /**
   * Drop & recreate `dbName` inside `dbContainerName`, then restore it from the
   * golden SQL file at `sqlPath` (read from THIS app container's filesystem and
   * streamed into the DB container via putArchive — no host bind-mount needed).
   */
  private async restoreSqlIntoDb(
    dbContainerName: string,
    dbName: string,
    rootPw: string,
    sqlPath: string,
  ): Promise<void> {
    const dbContainer = this.docker.getContainer(dbContainerName);
    const fs = await import("node:fs/promises");
    const sql = await fs.readFile(sqlPath);
    const tar = await import("tar-stream");
    const pack = tar.pack();
    pack.entry({ name: "restore.sql" }, sql);
    pack.finalize();
    const chunks: Buffer[] = [];
    for await (const chunk of pack as unknown as AsyncIterable<Buffer>) chunks.push(chunk);
    await dbContainer.putArchive(Buffer.concat(chunks), { path: "/tmp" });

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
    if (result.ExitCode !== 0) throw new Error(`mariadb restore exited ${result.ExitCode}`);
  }

  /** Poll a MariaDB container until it accepts connections, or time out. */
  private async waitForDb(dbContainerName: string, rootPw: string, timeoutMs = 90_000): Promise<void> {
    const c = this.docker.getContainer(dbContainerName);
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      try {
        const exec = await c.exec({
          Cmd: ["sh", "-c", `mariadb -u root -p"${rootPw}" -e "SELECT 1" >/dev/null 2>&1`],
          AttachStdout: true,
          AttachStderr: true,
        });
        const stream = await exec.start({ hijack: true, stdin: false });
        await new Promise<void>((resolve) => {
          stream.on("end", resolve);
          stream.on("error", () => resolve());
          stream.resume();
        });
        const r = await exec.inspect();
        if (r.ExitCode === 0) return;
      } catch {
        // container may not be ready to exec yet — retry
      }
      await new Promise((r) => setTimeout(r, 2_000));
    }
    throw new Error(`Database ${dbContainerName} not ready after ${timeoutMs}ms`);
  }

  private async ensureNetwork(name: string): Promise<void> {
    try {
      await this.docker.getNetwork(name).inspect();
    } catch {
      await this.docker.createNetwork({ Name: name, Driver: "bridge" });
    }
  }

  private hostUrl(port: number): string {
    const host =
      process.env.PUBLIC_HOST_IP ??
      process.env.PUBLIC_BASE_URL?.replace(/^https?:\/\//, "").replace(/\/.*$/, "") ??
      "localhost";
    return `http://${host}:${port}/`;
  }

  async spawnLab(spec: LabSpec): Promise<RunResult> {
    const slot = wpSlot(spec.environmentName, spec.port);
    if (slot !== null) return this.spawnWordpress(slot, spec.port);

    // Generic single-container lab (e.g. linuxserver webtop/kali on internal :3000).
    await this.destroyLab(spec); // clear any leftover with the same name
    const internalPort =
      spec.environmentName === "Ubuntu" || spec.environmentName === "Kali Linux" ? 3000 : undefined;
    return this.run(spec.image, spec.name, spec.port, { internalPort });
  }

  /**
   * Create a fresh WordPress + MariaDB pair on a dedicated network, wait for the
   * DB, restore the golden snapshot (clean lab), then start WordPress. Always
   * pulls the latest images. Idempotent — any prior pair is destroyed first.
   */
  private async spawnWordpress(slot: number, hostPort: number): Promise<RunResult> {
    const network = `tt-wp-demo${slot}`;
    const dbName = `wordpress-demo${slot}-db-1`;
    const wpName = `wordpress-demo${slot}-wordpress-1`;
    const database = `wp_demo${slot}`;
    const goldenSqlPath = `${LAB.goldenDir}/demo-${slot}.sql`;

    await this.destroyWordpress(slot);
    await this.ensureNetwork(network);
    await this.pullLatest(LAB.dbImage);
    await this.pullLatest(LAB.wpImage);

    // --- MariaDB ---
    const db = await this.docker.createContainer({
      Image: LAB.dbImage,
      name: dbName,
      Env: [
        `MARIADB_ROOT_PASSWORD=${LAB.dbRootPassword}`,
        `MARIADB_DATABASE=${database}`,
        `MARIADB_USER=${LAB.dbUser}`,
        `MARIADB_PASSWORD=${LAB.dbPassword}`,
      ],
      HostConfig: { NetworkMode: network, RestartPolicy: { Name: "no" } },
      NetworkingConfig: { EndpointsConfig: { [network]: { Aliases: ["db"] } } },
    });
    await db.start();
    await this.waitForDb(dbName, LAB.dbRootPassword);

    // Restore the clean golden snapshot before WordPress boots so it skips the
    // install wizard and comes up pre-configured.
    await this.restoreSqlIntoDb(dbName, database, LAB.dbRootPassword, goldenSqlPath);

    // --- WordPress ---
    const wp = await this.docker.createContainer({
      Image: LAB.wpImage,
      name: wpName,
      Env: [
        `WORDPRESS_DB_HOST=db`,
        `WORDPRESS_DB_USER=${LAB.dbUser}`,
        `WORDPRESS_DB_PASSWORD=${LAB.dbPassword}`,
        `WORDPRESS_DB_NAME=${database}`,
      ],
      ExposedPorts: { "80/tcp": {} },
      HostConfig: {
        NetworkMode: network,
        PortBindings: { "80/tcp": [{ HostPort: String(hostPort) }] },
        RestartPolicy: { Name: "no" },
      },
      NetworkingConfig: { EndpointsConfig: { [network]: {} } },
    });
    await wp.start();

    return { containerUrl: this.hostUrl(hostPort) };
  }

  async destroyLab(spec: LabSpec): Promise<void> {
    const slot = wpSlot(spec.environmentName, spec.port);
    if (slot !== null) return this.destroyWordpress(slot);
    await this.stopAndRemove(spec.name);
  }

  /** Force-remove the wp+db pair (and anonymous volumes) and the network. */
  private async destroyWordpress(slot: number): Promise<void> {
    const network = `tt-wp-demo${slot}`;
    for (const name of [`wordpress-demo${slot}-wordpress-1`, `wordpress-demo${slot}-db-1`]) {
      try {
        await this.docker.getContainer(name).remove({ force: true, v: true });
      } catch {
        // not present — nothing to remove
      }
    }
    try {
      await this.docker.getNetwork(network).remove();
    } catch {
      // not present
    }
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

  // On-demand lifecycle: route by environment (Ubuntu → remote engine, else local).
  async spawnLab(spec: LabSpec): Promise<RunResult> {
    return this.getService(spec.environmentName).spawnLab(spec);
  }
  async destroyLab(spec: LabSpec): Promise<void> {
    return this.getService(spec.environmentName).destroyLab(spec);
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
    goldenSqlPath: `${LAB.goldenDir}/demo-${n}.sql`,
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

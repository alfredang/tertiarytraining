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
  /**
   * On-demand lifecycle: create a fresh container (or wp+db pair) from scratch,
   * always pulling the latest image so every start runs an up-to-date, blank
   * lab. Returns the URL.
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

    // Generic single-container lab (e.g. linuxserver kali on internal :3000).
    await this.destroyLab(spec); // clear any leftover with the same name
    const internalPort = spec.environmentName === "Kali Linux" ? 3000 : undefined;
    return this.run(spec.image, spec.name, spec.port, { internalPort });
  }

  /**
   * Create a fresh WordPress + MariaDB pair on a dedicated network and start
   * them. Always pulls the latest images first, so every Start runs an
   * up-to-date, blank WordPress (the install wizard runs on first visit).
   * Idempotent — any prior pair is destroyed first.
   */
  private async spawnWordpress(slot: number, hostPort: number): Promise<RunResult> {
    const network = `tt-wp-demo${slot}`;
    const dbName = `wordpress-demo${slot}-db-1`;
    const wpName = `wordpress-demo${slot}-wordpress-1`;
    const database = `wp_demo${slot}`;

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

    // --- WordPress --- (its entrypoint waits for the DB; install wizard on first visit)
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
 * Return the list of *host* docker container names that need to be
 * started/stopped together for a given DockerContainer row.
 *
 * - WordPress: wp + db pair
 * - Kali Linux: single container matching the display name pattern
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
  if (args.environmentName === "Kali Linux") {
    const n = args.port - 8095;
    if (n < 1 || n > 5) return [];
    return [`kali-demo${n}`];
  }
  return [];
}

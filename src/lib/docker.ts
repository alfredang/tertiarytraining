/**
 * DockerService — abstracts container lifecycle.
 *
 * Modes:
 *   - "mock":     no daemon needed; just simulates stop/run and returns a generated URL.
 *   - "dockerode": real integration via the `dockerode` npm package and /var/run/docker.sock.
 *                  (Not bundled by default — install dockerode and uncomment the impl below.)
 */

export type RunResult = { containerUrl: string };

export interface DockerService {
  stopAndRemove(name: string): Promise<void>;
  run(image: string, name: string, port: number): Promise<RunResult>;
}

class MockDockerService implements DockerService {
  async stopAndRemove(name: string): Promise<void> {
    console.log(`[docker:mock] stop+remove ${name}`);
  }
  async run(image: string, name: string, port: number): Promise<RunResult> {
    console.log(`[docker:mock] run ${image} as ${name} on :${port}`);
    const base = process.env.PUBLIC_BASE_URL ?? "http://localhost";
    const token = Math.random().toString(36).slice(2, 8);
    return { containerUrl: `${base.replace(/\/$/, "")}:${port}/?s=${token}` };
  }
}

// To enable real Docker control:
//   1) npm i dockerode @types/dockerode
//   2) Mount /var/run/docker.sock into the Coolify app container
//   3) Set DOCKER_HOST_MODE=dockerode
//   4) Uncomment the implementation below.
//
// import Docker from "dockerode";
// class DockerodeService implements DockerService {
//   private docker = new Docker({ socketPath: "/var/run/docker.sock" });
//   async stopAndRemove(name: string) {
//     try {
//       const c = this.docker.getContainer(name);
//       await c.stop().catch(() => {});
//       await c.remove({ force: true }).catch(() => {});
//     } catch {}
//   }
//   async run(image: string, name: string, port: number): Promise<RunResult> {
//     await this.docker.pull(image);
//     const c = await this.docker.createContainer({
//       Image: image,
//       name,
//       HostConfig: { PortBindings: { [`${port}/tcp`]: [{ HostPort: String(port) }] } },
//       ExposedPorts: { [`${port}/tcp`]: {} },
//     });
//     await c.start();
//     const base = process.env.PUBLIC_BASE_URL ?? "http://localhost";
//     return { containerUrl: `${base.replace(/\/$/, "")}:${port}` };
//   }
// }

let _service: DockerService | null = null;
export function dockerService(): DockerService {
  if (_service) return _service;
  // const mode = process.env.DOCKER_HOST_MODE ?? "mock";
  // if (mode === "dockerode") _service = new DockerodeService();
  // else _service = new MockDockerService();
  _service = new MockDockerService();
  return _service;
}

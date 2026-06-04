import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { getEffectiveRole } from "@/lib/effectiveRole";
import { DashboardShell } from "@/components/DashboardShell";
import { navForRole } from "@/lib/adminNav";

export default async function Page() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return (
    <DashboardShell
      user={{ name: user.name, email: user.email, role: user.role }}
      nav={navForRole(await getEffectiveRole(user.role))}
    >
      <div className="max-w-3xl">
        <nav className="text-xs text-zinc-500 mb-4">
          <Link href="/how-to" className="hover:text-zinc-300">
            How To
          </Link>{" "}
          / Enable Real Docker Control
        </nav>

        <h1 className="text-2xl font-semibold mb-1">Enable Real Docker Control</h1>
        <p className="text-sm text-zinc-400 mb-8">
          Switch the app from the default <code>mock</code> Docker driver to{" "}
          <code>dockerode</code>, so <strong>Start</strong> / <strong>Stop</strong>{" "}
          actually control the host&apos;s Docker containers. The app uses an{" "}
          <strong>on-demand lifecycle</strong>: <strong>Start</strong> spawns a
          fresh container (WordPress = a new wp + db pair, latest image pulled
          every time so it&apos;s always up to date); <strong>Stop</strong>{" "}
          deletes the container entirely. A stopped lab therefore leaves nothing
          running and consumes <strong>zero memory</strong>.
        </p>

        <div className="space-y-8 text-sm leading-relaxed">
          <Section title="What changes when you flip the switch">
            <table className="w-full text-xs border border-zinc-800 rounded-lg overflow-hidden">
              <thead className="bg-zinc-900 text-zinc-400">
                <tr>
                  <th className="text-left px-3 py-2">Action</th>
                  <th className="text-left px-3 py-2">mock (default)</th>
                  <th className="text-left px-3 py-2">dockerode (real)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                <Row
                  k="Start (WordPress)"
                  a="No-op — only flips DB status"
                  b="Pulls latest images, creates a fresh blank wp + db pair on a dedicated network, starts WordPress. ~10–30 s."
                />
                <Row
                  k="Stop (WordPress)"
                  a="No-op — only flips DB status"
                  b="Force-removes the wp + db pair, volumes, and network. Zero memory while stopped."
                />
                <Row
                  k="Refresh WordPress"
                  a="No-op — only logs"
                  b="Recreate fresh: destroys the pair and spawns a new one from the latest image."
                />
                <Row
                  k="Latest image on Start"
                  a="n/a"
                  b="Always pulled (falls back to local copy only if the registry pull fails)"
                />
                <Row
                  k="Host Docker socket required"
                  a="No"
                  b="Yes — must be bind-mounted into the app container"
                />
              </tbody>
            </table>
          </Section>

          <Step number={1} title="Mount the Docker socket into the app container">
            <p>
              In Coolify → your app → <strong>Storage</strong> → add a bind
              mount:
            </p>
            <table className="w-full text-xs border border-zinc-800 rounded-lg overflow-hidden">
              <thead className="bg-zinc-900 text-zinc-400">
                <tr>
                  <th className="text-left px-3 py-2">Field</th>
                  <th className="text-left px-3 py-2">Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                <Row k="Host path" a="/var/run/docker.sock" b="" single />
                <Row k="Container path" a="/var/run/docker.sock" b="" single />
                <Row k="Read-only" a="No (we need to issue docker commands)" b="" single />
              </tbody>
            </table>
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200/90">
              ⚠️ Mounting the docker socket gives the app container full
              control of the host Docker daemon — same security level as root
              on the host. Only do this on hosts you control.
            </div>
            <p className="text-xs text-zinc-500">
              That&apos;s the only mount required — there are no golden
              snapshots to mount. Every Start pulls the latest image and
              creates a fresh, blank WordPress.
            </p>
          </Step>

          <Step number={2} title="Set the env var">
            <p>
              In Coolify → your app → <strong>Environment Variables</strong>:
            </p>
            <pre className="bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-xs overflow-x-auto">
              DOCKER_HOST_MODE=dockerode
            </pre>
            <p>Save.</p>
          </Step>

          <Step number={3} title="Redeploy">
            <p>
              Click <strong>Redeploy</strong>. On boot the app logs{" "}
              <code>[docker] using DockerodeService</code> — that&apos;s your
              signal it&apos;s wired up correctly.
            </p>
            <p>
              If you see <code>failed to init DockerodeService, falling back
              to mock</code>, the socket isn&apos;t reachable. Most common
              cause: the <code>app</code> user inside the container doesn&apos;t
              have permission on the socket. Check the host&apos;s docker
              group GID:
            </p>
            <pre className="bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-xs overflow-x-auto">
{`getent group docker
# If GID is something other than 999, rebuild with:
docker build --build-arg DOCKER_GID=<your-gid> -t app .`}
            </pre>
          </Step>

          <Step number={4} title="Verify the on-demand lifecycle">
            <p>
              Log in as admin → <Link href="/admin/containers" className="text-indigo-400 hover:underline">Admin → Containers</Link>{" "}
              → filter by <strong>WordPress</strong> → click <strong>Start</strong> on{" "}
              <code>WP Demo 1</code>.
            </p>
            <ul className="list-disc pl-5 space-y-0.5 text-xs">
              <li>Status flips to <code>REFRESHING</code> (provisioning) then to <code>RUNNING</code> once the pair is up (~10–30 s on first pull).</li>
              <li>On the host, <code>docker ps</code> now shows <code>wordpress-demo1-wordpress-1</code> and <code>wordpress-demo1-db-1</code> — they did not exist before Start.</li>
              <li>Open <code>http://168.231.119.201:8081/</code> — a fresh WordPress install wizard (brand-new blank site on the latest image).</li>
              <li>Click <strong>Stop</strong>: status goes to <code>STOPPED</code> and <code>docker ps -a</code> shows the pair is <em>gone</em> (not just stopped) — zero memory used.</li>
            </ul>
          </Step>

          <Section title="Reverting to mock mode">
            <p>
              If real Docker control causes issues, flip back to safe mode by
              setting <code>DOCKER_HOST_MODE=mock</code> in Coolify and
              redeploying. The bind mounts can stay — they&apos;re ignored in
              mock mode.
            </p>
          </Section>
        </div>
      </div>
    </DashboardShell>
  );
}

function Step({
  number,
  title,
  children,
}: {
  number: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
      <div className="flex items-center gap-3 mb-3">
        <div className="h-7 w-7 rounded-full bg-indigo-500/20 text-indigo-300 grid place-items-center text-sm font-semibold">
          {number}
        </div>
        <h2 className="font-semibold text-zinc-100">{title}</h2>
      </div>
      <div className="space-y-3 text-zinc-300">{children}</div>
    </section>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
      <h2 className="font-semibold text-zinc-100 mb-3">{title}</h2>
      <div className="space-y-3 text-zinc-300">{children}</div>
    </section>
  );
}

function Row({
  k,
  a,
  b,
  single,
}: {
  k: string;
  a: string;
  b: string;
  single?: boolean;
}) {
  if (single) {
    return (
      <tr>
        <td className="px-3 py-2 text-zinc-400 align-top whitespace-nowrap">{k}</td>
        <td className="px-3 py-2 text-zinc-200">
          {k === "Host path" || k === "Container path" ? <code>{a}</code> : a}
        </td>
      </tr>
    );
  }
  return (
    <tr>
      <td className="px-3 py-2 text-zinc-400 align-top whitespace-nowrap">{k}</td>
      <td className="px-3 py-2 text-zinc-300">{a}</td>
      <td className="px-3 py-2 text-zinc-300">{b}</td>
    </tr>
  );
}

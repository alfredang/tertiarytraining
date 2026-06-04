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
          / Container Lifecycle
        </nav>

        <h1 className="text-2xl font-semibold mb-1">Container Lifecycle Guide</h1>
        <p className="text-sm text-zinc-400 mb-8">
          Lab containers are <strong>on-demand</strong>. They don&apos;t run
          around the clock — a container only exists while a lab is started.
          This keeps the server&apos;s memory free and guarantees every session
          runs on an up-to-date image.
        </p>

        <div className="space-y-8 text-sm leading-relaxed">
          <Section title="The three actions">
            <table className="w-full text-xs border border-zinc-800 rounded-lg overflow-hidden">
              <thead className="bg-zinc-900 text-zinc-400">
                <tr>
                  <th className="text-left px-3 py-2">Action</th>
                  <th className="text-left px-3 py-2">What it does</th>
                  <th className="text-left px-3 py-2">Memory</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                <Row
                  k="▶ Start"
                  a="Pulls the latest image and spawns a brand-new container (WordPress = a fresh wp + db pair). The lab comes up clean."
                  b="Allocated while running"
                />
                <Row
                  k="■ Stop"
                  a="Deletes the container(s), volumes, and network entirely — nothing is left behind."
                  b="Freed completely → 0"
                />
                <Row
                  k="↻ Refresh"
                  a="Destroys and re-creates the lab from the latest image — a fast way to reset a session that a learner has broken."
                  b="Re-allocated"
                />
              </tbody>
            </table>
            <p className="text-xs text-zinc-500">
              A <strong>stopped</strong> lab consumes <strong>zero</strong> memory
              and zero CPU because the container no longer exists — not merely
              paused. Starting it again creates a fresh one.
            </p>
          </Section>

          <Section title="Why on-demand?">
            <ul className="list-disc pl-5 space-y-1 text-zinc-300">
              <li>
                <strong>Saves memory.</strong> The VPS only spends RAM on labs
                that are actively in use. Idle labs cost nothing.
              </li>
              <li>
                <strong>Always up to date.</strong> Every Start re-pulls the
                latest image, so learners never run a stale build.
              </li>
              <li>
                <strong>Always clean.</strong> Each Start is a brand-new
                container, so one learner&apos;s changes never carry over to the
                next session.
              </li>
            </ul>
          </Section>

          <Section title="Status badges">
            <table className="w-full text-xs border border-zinc-800 rounded-lg overflow-hidden">
              <thead className="bg-zinc-900 text-zinc-400">
                <tr>
                  <th className="text-left px-3 py-2">Status</th>
                  <th className="text-left px-3 py-2">Meaning</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                <Row k="STOPPED" a="No container exists. Nothing is running. Click Start to spawn one." b="" single />
                <Row k="REFRESHING" a="Provisioning — pulling the image and creating the container(s). Usually 10–30 s." b="" single />
                <Row k="RUNNING" a="The container is live and the access URL works." b="" single />
                <Row k="ERROR" a="The last Start/Stop failed. Try again, or check with an admin." b="" single />
              </tbody>
            </table>
          </Section>

          <Section title="What each environment spawns">
            <ul className="list-disc pl-5 space-y-1 text-zinc-300">
              <li>
                <strong>WordPress</strong> — a pair of containers (WordPress +
                MariaDB) on a private network, published on its assigned port
                (8081–8085). First visit shows the WordPress install wizard.
              </li>
              <li>
                <strong>Kali Linux</strong> — a single browser-desktop
                container.
              </li>
              <li>
                <strong>Kubernetes</strong> — runs externally on Killercoda (a
                browser playground), so it never uses this server&apos;s memory.
              </li>
            </ul>
          </Section>

          <Section title="Who can do what">
            <ul className="list-disc pl-5 space-y-1 text-zinc-300">
              <li><strong>Admins</strong> — Start / Stop / Refresh any lab.</li>
              <li><strong>Trainers</strong> — Start / Stop / Refresh labs in the environments assigned to them.</li>
              <li><strong>Learners</strong> — open a running lab&apos;s URL, but cannot Start, Stop, or Refresh.</li>
            </ul>
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200/90">
              💡 Stop labs you&apos;re done with. Because stopping deletes the
              container, it immediately frees the memory for everyone else — and
              an idle-cleanup job also stops labs left running too long.
            </div>
          </Section>
        </div>
      </div>
    </DashboardShell>
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
        <td className="px-3 py-2 text-zinc-400 align-top whitespace-nowrap font-mono">{k}</td>
        <td className="px-3 py-2 text-zinc-300">{a}</td>
      </tr>
    );
  }
  return (
    <tr>
      <td className="px-3 py-2 text-zinc-200 align-top whitespace-nowrap font-medium">{k}</td>
      <td className="px-3 py-2 text-zinc-300">{a}</td>
      <td className="px-3 py-2 text-zinc-400 align-top whitespace-nowrap">{b}</td>
    </tr>
  );
}

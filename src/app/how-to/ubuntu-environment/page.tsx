import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { getEffectiveRole } from "@/lib/effectiveRole";
import { DashboardShell } from "@/components/DashboardShell";
import { navForRole } from "@/lib/adminNav";

const demos = [
  { name: "Ubuntu Demo 1", url: "http://168.231.119.201:8091/" },
  { name: "Ubuntu Demo 2", url: "http://168.231.119.201:8092/" },
  { name: "Ubuntu Demo 3", url: "http://168.231.119.201:8093/" },
  { name: "Ubuntu Demo 4", url: "http://168.231.119.201:8094/" },
  { name: "Ubuntu Demo 5", url: "http://168.231.119.201:8095/" },
];

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
          / Ubuntu Environment
        </nav>

        <h1 className="text-2xl font-semibold mb-1">Ubuntu Environment</h1>
        <p className="text-sm text-zinc-400 mb-8">
          5 independent Ubuntu 24.04 desktop containers, accessed via a full
          web-based XFCE GUI (powered by{" "}
          <a
            href="https://docs.linuxserver.io/images/docker-webtop/"
            target="_blank"
            rel="noreferrer"
            className="text-indigo-400 hover:underline"
          >
            linuxserver/webtop
          </a>
          ). Learners get a real Ubuntu desktop in their browser — file manager,
          terminal, browser, install anything via apt.
        </p>

        <div className="space-y-8 text-sm leading-relaxed">
          <Section title="Demo containers">
            <table className="w-full text-xs border border-zinc-800 rounded-lg overflow-hidden">
              <thead className="bg-zinc-900 text-zinc-400">
                <tr>
                  <th className="text-left px-3 py-2">Name</th>
                  <th className="text-left px-3 py-2">Desktop URL</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {demos.map((d) => (
                  <tr key={d.name}>
                    <td className="px-3 py-2 text-zinc-200">{d.name}</td>
                    <td className="px-3 py-2">
                      <a
                        href={d.url}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="text-indigo-400 hover:underline"
                      >
                        {d.url}
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-xs text-zinc-500">
              First boot of each container takes ~20 seconds to come up. After
              that, page loads are near-instant.
            </p>
          </Section>

          <Section title="External Ubuntu container (fallback)">
            <p>
              If all 5 in-house Ubuntu demos are in use, broken, or refreshing,
              learners can use the free{" "}
              <strong>Killercoda Ubuntu Playground</strong> as a drop-in
              alternative — a fresh Ubuntu VM in the browser, no signup
              required, ~60 minute session.
            </p>
            <a
              href="https://killercoda.com/playgrounds/scenario/ubuntu"
              target="_blank"
              rel="noreferrer noopener"
              className="block rounded-xl border border-indigo-500/30 bg-indigo-500/10 p-4 hover:border-indigo-400/60 hover:bg-indigo-500/15 transition-colors"
            >
              <div className="flex items-baseline gap-3">
                <span className="text-2xl">↗</span>
                <div className="flex-1">
                  <div className="font-semibold text-zinc-100">
                    Killercoda Ubuntu Playground
                  </div>
                  <div className="text-xs text-indigo-300 mt-0.5">
                    killercoda.com/playgrounds/scenario/ubuntu
                  </div>
                  <p className="text-xs text-zinc-400 mt-2">
                    Browser-based Ubuntu terminal hosted by Killercoda. Opens
                    in a new tab. No login needed; session expires after
                    inactivity.
                  </p>
                </div>
              </div>
            </a>
            <p className="text-xs text-zinc-500">
              External service — we don&apos;t control uptime, packages, or
              data persistence. Use only for ad-hoc exercises, not for
              graded work.
            </p>
          </Section>

          <Section title="What learners get">
            <ul className="list-disc pl-5 space-y-1">
              <li>
                <strong>Ubuntu 24.04 LTS</strong> with the full XFCE desktop
                environment
              </li>
              <li>
                Pre-installed: Firefox, file manager, terminal (right-click
                desktop → Open Terminal Here)
              </li>
              <li>
                Passwordless <code>sudo</code> as the default user
              </li>
              <li>
                Persistent inside the session; wiped on Refresh
              </li>
            </ul>
            <p className="text-xs text-zinc-500">
              Node.js, Python, etc. are <strong>not</strong> preinstalled —
              the webtop image stays slim. Learners (or the admin via a
              custom image) can install whatever they need:
            </p>
            <pre className="bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-xs overflow-x-auto">
{`# In the in-browser terminal:
sudo apt-get update
sudo apt-get install -y nodejs npm
sudo apt-get install -y python3-pip
# …or anything else from the Ubuntu repos`}
            </pre>
          </Section>

          <Section title="Refreshing an Ubuntu container">
            <p>
              Refresh does a full <strong>stop + remove + recreate</strong>{" "}
              from the <code>linuxserver/webtop:ubuntu-xfce</code> image. The
              new container starts clean — no installed packages, no learner
              files.
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>
                <strong>Admin</strong>:{" "}
                <Link
                  href="/admin/containers"
                  className="text-indigo-400 hover:underline"
                >
                  Admin → Containers
                </Link>{" "}
                → filter <strong>Ubuntu</strong> → click ↻ on a single
                container, or <strong>↻ Refresh by environment</strong> for
                all five.
              </li>
              <li>
                <strong>Trainer</strong>: from{" "}
                <Link
                  href="/dashboard/trainer"
                  className="text-indigo-400 hover:underline"
                >
                  Trainer Dashboard
                </Link>
                , click <strong>↻ Refresh all Ubuntu</strong>. Requires the
                Ubuntu environment to be assigned to the trainer.
              </li>
            </ul>
            <p className="text-xs text-zinc-400">
              Refresh takes ~5-10 s per container. After refresh, wait
              another ~20 s for the desktop to be ready in the browser.
            </p>
          </Section>

          <Section title="Setup (one-time)">
            <p>
              The first time you bring up the Ubuntu environment on a fresh
              Coolify host, SSH in and run:
            </p>
            <pre className="bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-xs overflow-x-auto">
{`curl -sL https://raw.githubusercontent.com/alfredang/tertiarytraining/main/scripts/tt-ubuntu-bootstrap.sh \\
  -o /usr/local/bin/tt-ubuntu-bootstrap.sh
chmod +x /usr/local/bin/tt-ubuntu-bootstrap.sh
/usr/local/bin/tt-ubuntu-bootstrap.sh`}
            </pre>
            <p className="text-xs text-zinc-500">
              This pulls <code>lscr.io/linuxserver/webtop:ubuntu-xfce</code>{" "}
              (~3 GB) and runs <code>ubuntu-demo1..5</code> on host ports
              8091..8095. Idempotent — safe to re-run.
            </p>
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

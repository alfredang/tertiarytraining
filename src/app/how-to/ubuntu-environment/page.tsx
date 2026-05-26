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
          5 independent Ubuntu 24.04 lab containers, each exposing a
          web-based bash terminal via ttyd. Pre-installed with Node.js 24
          and the usual dev tooling, so learners can install software like
          OpenClaw, Hermes, or anything else on top.
        </p>

        <div className="space-y-8 text-sm leading-relaxed">
          <Section title="Demo containers">
            <table className="w-full text-xs border border-zinc-800 rounded-lg overflow-hidden">
              <thead className="bg-zinc-900 text-zinc-400">
                <tr>
                  <th className="text-left px-3 py-2">Name</th>
                  <th className="text-left px-3 py-2">Terminal URL</th>
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
          </Section>

          <Section title="What's preinstalled">
            <ul className="list-disc pl-5 space-y-1">
              <li>
                <strong>Ubuntu 24.04 LTS</strong>
              </li>
              <li>
                <strong>Node.js 24</strong> + npm + yarn + pnpm
              </li>
              <li>
                <strong>Python 3</strong> + pip + venv
              </li>
              <li>
                <strong>Build essentials</strong>: gcc, make, pkg-config, python3-dev
              </li>
              <li>
                <strong>CLI tools</strong>: git, curl, wget, jq, vim, nano, tmux, htop, tree, unzip, zip
              </li>
              <li>
                <strong>Networking</strong>: net-tools, ping, dnsutils
              </li>
              <li>
                <strong>SSH client</strong>
              </li>
              <li>
                Non-root <code>trainer</code> user with passwordless sudo
              </li>
            </ul>
          </Section>

          <Section title="How learners use it">
            <ol className="list-decimal pl-5 space-y-2">
              <li>
                Open the assigned Ubuntu demo URL — e.g.{" "}
                <code>http://168.231.119.201:8091/</code>.
              </li>
              <li>
                A live bash terminal loads in the browser (powered by{" "}
                <a
                  href="https://github.com/tsl0922/ttyd"
                  target="_blank"
                  rel="noreferrer"
                  className="text-indigo-400 hover:underline"
                >
                  ttyd
                </a>
                ).
              </li>
              <li>
                Run commands as the <code>trainer</code> user. You have
                passwordless sudo, so:
                <pre className="bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-xs overflow-x-auto mt-2">
{`sudo apt-get update && sudo apt-get install -y <package>
git clone https://github.com/...
npm install -g <pkg>`}
                </pre>
              </li>
              <li>
                Verify Node:
                <pre className="bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-xs overflow-x-auto mt-2">
{`node --version    # v24.x.x
npm --version`}
                </pre>
              </li>
            </ol>
          </Section>

          <Section title="Refreshing an Ubuntu container">
            <p>
              Unlike WordPress (which uses a fast DB-only soft-reset),
              refreshing an Ubuntu container does a full <strong>stop +
              remove + recreate</strong> — the new container starts from
              the original <code>tertiary-ubuntu</code> image with no
              learner-installed packages.
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
                , click <strong>↻ Refresh all Ubuntu</strong> on the Ubuntu
                section header. (Requires the Ubuntu environment to be
                assigned to that trainer.)
              </li>
            </ul>
            <p className="text-xs text-zinc-400">
              Refresh takes ~5-10 s per container (full container recreate).
              Anything the learner installed via <code>sudo apt-get install</code>{" "}
              or saved in the home directory is gone.
            </p>
          </Section>

          <Section title="Updating the base image">
            <p>
              The image lives at <code>tertiary-ubuntu:latest</code> on the
              host. Edit <code>infra/ubuntu/Dockerfile</code> in this repo
              to add system packages or change the Node major version, then
              on the Coolify host re-run:
            </p>
            <pre className="bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-xs overflow-x-auto">
              /usr/local/bin/tt-ubuntu-bootstrap.sh
            </pre>
            <p className="text-xs text-zinc-400">
              The script pulls the latest Dockerfile + motd from{" "}
              <code>main</code>, rebuilds the image, and recreates all 5
              demo containers.
            </p>
          </Section>

          <Section title="Troubleshooting">
            <Issue
              symptom="The terminal URL returns ERR_CONNECTION_REFUSED"
              fix={
                <>
                  The ttyd process inside the container died, or the
                  container isn&apos;t running. On the host:
                  <pre className="bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-xs overflow-x-auto my-1">
                    docker logs ubuntu-demoN --tail 20
                  </pre>
                  …or just click <strong>↻ Refresh</strong> in the admin UI.
                </>
              }
            />
            <Issue
              symptom="Terminal opens but pressing keys does nothing"
              fix={
                <>
                  ttyd is in read-only mode. Confirm the container was
                  started with the <code>-W</code> flag (writable). The
                  Dockerfile&apos;s CMD includes it.
                </>
              }
            />
            <Issue
              symptom="Learner needs to install something but apt fails with 'permission denied'"
              fix={
                <>
                  They forgot <code>sudo</code>. The <code>trainer</code>{" "}
                  user has passwordless sudo:{" "}
                  <code>sudo apt-get install …</code>
                </>
              }
            />
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

function Issue({
  symptom,
  fix,
}: {
  symptom: string;
  fix: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-zinc-800 p-3">
      <div className="text-rose-300 text-xs font-medium mb-1">{symptom}</div>
      <div className="text-zinc-300 text-xs">{fix}</div>
    </div>
  );
}

import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { getEffectiveRole } from "@/lib/effectiveRole";
import { DashboardShell } from "@/components/DashboardShell";
import { navForRole } from "@/lib/adminNav";

const demos = [
  { name: "Kali Demo 1", url: "http://168.231.119.201:8096/" },
  { name: "Kali Demo 2", url: "http://168.231.119.201:8097/" },
  { name: "Kali Demo 3", url: "http://168.231.119.201:8098/" },
  { name: "Kali Demo 4", url: "http://168.231.119.201:8099/" },
  { name: "Kali Demo 5", url: "http://168.231.119.201:8100/" },
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
          / Kali Linux Environment
        </nav>

        <h1 className="text-2xl font-semibold mb-1">Kali Linux Environment</h1>
        <p className="text-sm text-zinc-400 mb-8">
          5 independent Kali Linux rolling-release desktop containers (
          <a
            href="https://docs.linuxserver.io/images/docker-kali-linux/"
            target="_blank"
            rel="noreferrer"
            className="text-indigo-400 hover:underline"
          >
            linuxserver/kali-linux
          </a>
          ). Each opens a full Kali XFCE desktop in the browser — for
          offensive-security / CTF training.
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
              First boot ~30 s. The base image is large (~5 GB pulled
              once on the host).
            </p>
          </Section>

          <Section title="Installing the Kali toolsets">
            <p>
              The base image ships only the Kali rolling system + desktop —
              no offensive tooling. Inside a Kali demo, open a terminal and
              install what you need:
            </p>
            <pre className="bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-xs overflow-x-auto">
{`sudo apt-get update

# Popular individual metapackages:
sudo apt-get install -y kali-tools-top10          # ~1 GB
sudo apt-get install -y kali-tools-web            # web hacking
sudo apt-get install -y kali-tools-passwords      # password attacks
sudo apt-get install -y kali-tools-wireless       # wireless
sudo apt-get install -y kali-tools-forensics      # forensics

# Or everything at once (heavy, ~9 GB extra):
sudo apt-get install -y kali-tools-everything`}
            </pre>
            <p className="text-xs text-zinc-400">
              Installed tools are <strong>wiped on Refresh</strong>. For
              long-term setups, bake them into a custom image (see{" "}
              <Link
                href="/how-to/enable-real-docker"
                className="text-indigo-400 hover:underline"
              >
                Enable Real Docker Control
              </Link>{" "}
              for the pattern used by the WordPress demos).
            </p>
          </Section>

          <Section title="Refreshing a Kali container">
            <p>
              Refresh stops + removes the container and recreates it from
              the base <code>linuxserver/kali-linux</code> image — fast way
              to give learners a clean slate between exercises.
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
                → filter <strong>Kali Linux</strong> → click ↻ on a single
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
                , click <strong>↻ Refresh all Kali Linux</strong>. Requires
                the environment to be assigned to the trainer.
              </li>
            </ul>
          </Section>

          <Section title="Setup (one-time)">
            <p>
              On a fresh Coolify host, SSH in and run:
            </p>
            <pre className="bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-xs overflow-x-auto">
{`curl -sL https://raw.githubusercontent.com/alfredang/tertiarytraining/main/scripts/tt-kali-bootstrap.sh \\
  -o /usr/local/bin/tt-kali-bootstrap.sh
chmod +x /usr/local/bin/tt-kali-bootstrap.sh
/usr/local/bin/tt-kali-bootstrap.sh`}
            </pre>
            <p className="text-xs text-zinc-500">
              Pulls the Kali image (~5 GB) and runs{" "}
              <code>kali-demo1..5</code> on host ports 8096..8100.
              Idempotent.
            </p>
          </Section>

          <Section title="Heads-up on resource use">
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200/90">
              ⚠️ A single idle Kali desktop container uses ~1–2 GB of RAM.
              Running all 5 simultaneously alongside the WordPress stack on
              the same VPS will be tight on an 8 GB box. With the on-demand
              lifecycle, stopping a lab deletes its container and frees the
              memory — so stop labs that aren&apos;t in active use.
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

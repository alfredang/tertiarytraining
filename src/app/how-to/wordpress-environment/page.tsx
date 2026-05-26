import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { getEffectiveRole } from "@/lib/effectiveRole";
import { DashboardShell } from "@/components/DashboardShell";
import { navForRole } from "@/lib/adminNav";

const WP_USER = "tertiarytraining";
const WP_PASS = "Tertiary12345";

const demos = [
  { name: "WP Demo 1", url: "http://168.231.119.201:8081/" },
  { name: "WP Demo 2", url: "http://168.231.119.201:8082/" },
  { name: "WP Demo 3", url: "http://168.231.119.201:8083/" },
  { name: "WP Demo 4", url: "http://168.231.119.201:8084/" },
  { name: "WP Demo 5", url: "http://168.231.119.201:8085/" },
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
          / WordPress Environment
        </nav>

        <h1 className="text-2xl font-semibold mb-1">WordPress Environment</h1>
        <p className="text-sm text-zinc-400 mb-8">
          The WordPress environment exposes 5 demo containers that learners and
          trainers can use for hands-on practice. This guide covers two common
          tasks.
        </p>

        <div className="space-y-8 text-sm leading-relaxed">
          {/* ---- Demo container reference ---- */}
          <Section title="WordPress demo containers">
            <p>The training environment has 5 independent WordPress sites:</p>
            <table className="w-full text-xs border border-zinc-800 rounded-lg overflow-hidden">
              <thead className="bg-zinc-900 text-zinc-400">
                <tr>
                  <th className="text-left px-3 py-2">Name</th>
                  <th className="text-left px-3 py-2">Public URL</th>
                  <th className="text-left px-3 py-2">Admin URL</th>
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
                    <td className="px-3 py-2">
                      <a
                        href={`${d.url}wp-admin`}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="text-indigo-400 hover:underline"
                      >
                        {d.url}wp-admin
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-xs text-zinc-500">
              All 5 sites share the same admin credentials and can be refreshed
              independently or as a group.
            </p>
          </Section>

          {/* ---- Access backend admin ---- */}
          <Section title="How to access the WordPress backend admin">
            <p>
              All 5 demo containers are pre-configured with the{" "}
              <strong>same admin credentials</strong>:
            </p>
            <div className="rounded-lg border border-indigo-500/30 bg-indigo-500/10 p-4 text-sm space-y-1.5">
              <div className="flex items-baseline gap-2">
                <span className="text-zinc-400 min-w-[100px]">Username</span>
                <code className="text-zinc-100">{WP_USER}</code>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-zinc-400 min-w-[100px]">Password</span>
                <code className="text-zinc-100">{WP_PASS}</code>
              </div>
            </div>
            <p>Log in to any of the 5 demos via the wp-admin URL:</p>
            <ul className="list-disc pl-5 text-xs space-y-0.5">
              {demos.map((d) => (
                <li key={d.name}>
                  {d.name}:{" "}
                  <a
                    href={`${d.url}wp-admin`}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="text-indigo-400 hover:underline"
                  >
                    {d.url}wp-admin
                  </a>
                </li>
              ))}
            </ul>
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200/90">
              ⚠️ Although the username/password are the same across all 5
              demos, each container has its own independent database. Changes
              made on Demo 1 do not appear on Demo 2.
            </div>
            <p className="text-xs text-zinc-500">
              If a refresh wipes the container (see next section), the WordPress
              install wizard re-runs on first visit and you&apos;ll need to
              re-enter these same credentials to restore the demo.
            </p>
          </Section>

          {/* ---- Refresh containers ---- */}
          <Section title="How to refresh WordPress containers">
            <p>
              Refreshing wipes a container back to a fresh WordPress install.
              Use this between classes or when a learner has broken their
              site.
            </p>
            <h3 className="font-medium text-zinc-100 mt-3">Refresh a single container (Admin)</h3>
            <ol className="list-decimal pl-5 space-y-1">
              <li>
                Go to{" "}
                <Link
                  href="/admin/containers"
                  className="text-indigo-400 hover:underline"
                >
                  Admin → Containers
                </Link>
                .
              </li>
              <li>
                Filter the environment dropdown to <strong>WordPress</strong>.
              </li>
              <li>
                On the row for the container you want to reset (e.g.{" "}
                <code>WP Demo 3</code>), click the{" "}
                <strong>↻</strong> button in the Actions column.
              </li>
              <li>
                Wait ~10 seconds. The status badge cycles{" "}
                <code>RUNNING → REFRESHING → RUNNING</code> and{" "}
                <strong>Last refreshed</strong> updates.
              </li>
            </ol>

            <h3 className="font-medium text-zinc-100 mt-3">
              Refresh all WordPress containers at once (Admin or Trainer)
            </h3>
            <ul className="list-disc pl-5 space-y-1">
              <li>
                <strong>Admins:</strong> from{" "}
                <Link
                  href="/admin/containers"
                  className="text-indigo-400 hover:underline"
                >
                  Admin → Containers
                </Link>
                , pick <code>WordPress</code> in the environment dropdown, then
                click <strong>↻ Refresh by environment</strong>. All 5 demos
                cycle in parallel.
              </li>
              <li>
                <strong>Trainers:</strong> from your{" "}
                <Link
                  href="/dashboard/trainer"
                  className="text-indigo-400 hover:underline"
                >
                  Trainer Dashboard
                </Link>
                , click <strong>↻ Refresh all WordPress</strong> on the
                WordPress section header.
              </li>
            </ul>

            <h3 className="font-medium text-zinc-100 mt-3">What happens under the hood (real Docker mode)</h3>
            <ol className="list-decimal pl-5 space-y-1 text-zinc-400">
              <li>The WP container <strong>keeps running</strong> — no restart, no downtime</li>
              <li>The DB container&apos;s <code>wordpress</code> database is dropped</li>
              <li>The golden SQL snapshot under <code>/opt/tertiarytraining/wp-golden/demo-N.sql</code> is restored into the DB</li>
              <li>The shared <code>tertiarytraining</code> admin credentials and any baseline sample content are <strong>preserved</strong></li>
              <li>Any learner-added posts, pages, plugins activations are <strong>gone</strong></li>
              <li>Status flips back to <code>RUNNING</code> and a row is added to <Link href="/admin/refresh-logs" className="text-indigo-400 hover:underline">Refresh Logs</Link></li>
              <li>Total time: ~1-2 seconds per container</li>
            </ol>
            <p className="text-xs text-zinc-500">
              See{" "}
              <Link href="/how-to/enable-real-docker" className="text-indigo-400 hover:underline">
                Enable Real Docker Control
              </Link>{" "}
              for the one-time setup to capture each demo&apos;s golden snapshot.
            </p>

            <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-200/90">
              🛑 <strong>Learners cannot refresh containers.</strong> The refresh
              action is intentionally restricted to Trainers and Admins to
              prevent learners wiping each other&apos;s in-progress work.
            </div>

            <div className="rounded-lg border border-zinc-700 bg-zinc-800/40 p-3 text-xs text-zinc-300">
              ℹ️ <strong>Current build runs refresh in <code>mock</code> mode.</strong>{" "}
              Refresh logs and UI behave correctly, but the underlying Docker
              container is not actually recreated until <code>DOCKER_HOST_MODE</code>{" "}
              is set to <code>dockerode</code> in Coolify env vars and the
              host Docker socket is mounted. See the Dockerfile / docker.ts
              comments for the one-line switch.
            </div>
          </Section>

          {/* ---- Troubleshooting ---- */}
          <Section title="Troubleshooting">
            <Issue
              symptom="Clicking Access returns ERR_CONNECTION_REFUSED"
              fix={
                <>
                  The WordPress container isn&apos;t running. SSH to the
                  Coolify host and check{" "}
                  <code>docker ps | grep wordpress-demo</code> — if any are
                  stopped, run <code>docker start wordpress-demoN-wordpress-1</code>.
                </>
              }
            />
            <Issue
              symptom="WordPress shows the install wizard every visit"
              fix={
                <>
                  The container is being refreshed too aggressively, or its
                  database volume isn&apos;t persisting. Confirm the WordPress
                  containers were not refreshed since you last completed the
                  setup wizard. Check the <Link href="/admin/refresh-logs" className="text-indigo-400 hover:underline">Refresh Logs</Link> page.
                </>
              }
            />
            <Issue
              symptom="Forgot the wp-admin password after first install"
              fix={
                <>
                  Just refresh that single container (Admin → Containers → ↻).
                  The next visit lets you set a new admin password from
                  scratch. Existing learner work in that demo will be lost —
                  warn them first.
                </>
              }
            />
            <Issue
              symptom="A learner says the WordPress URL works but the site looks broken"
              fix={
                <>
                  Most likely a plugin / theme misconfiguration. Refresh that
                  container to wipe it and ask the learner to restart the
                  exercise.
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

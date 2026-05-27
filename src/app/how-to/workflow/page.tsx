import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { getEffectiveRole } from "@/lib/effectiveRole";
import { DashboardShell } from "@/components/DashboardShell";
import { navForRole } from "@/lib/adminNav";
import { getDefaultValidityDays } from "@/lib/settings";

const IDLE_HOURS = Number(process.env.IDLE_AUTOSTOP_HOURS ?? "2");

export default async function Page() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const effectiveRole = await getEffectiveRole(user.role);
  const validityDays = await getDefaultValidityDays();

  return (
    <DashboardShell
      user={{ name: user.name, email: user.email, role: user.role }}
      nav={navForRole(effectiveRole)}
    >
      <div className="max-w-3xl">
        <nav className="text-xs text-zinc-500 mb-4">
          <Link href="/how-to" className="hover:text-zinc-300">
            How To
          </Link>{" "}
          / Step-by-Step Workflow
        </nav>

        <h1 className="text-2xl font-semibold mb-1">Step-by-Step Workflow</h1>
        <p className="text-sm text-zinc-400 mb-8">
          The end-to-end flow for trainers and admins, from learner signup
          through container lifecycle to account expiry. Follow these six
          steps for every new class.
        </p>

        <div className="space-y-6 text-sm leading-relaxed">
          <Step
            n={1}
            title="Learner signs up"
            who="Learner"
          >
            <p>
              The learner opens the public site and self-registers:
            </p>
            <ol className="list-decimal pl-5 space-y-1">
              <li>
                Go to{" "}
                <a
                  href="/signup/learner"
                  className="text-indigo-400 hover:underline"
                >
                  /signup/learner
                </a>
                .
              </li>
              <li>
                Enter name, email, and password, then submit.
              </li>
              <li>
                The account is created in <code>PENDING</code> status — the
                learner cannot log in yet and will see a &ldquo;waiting for
                approval&rdquo; message.
              </li>
            </ol>
            <Note>
              Trainer signups (<code>/signup/trainer</code>) are also{" "}
              <code>PENDING</code>, but trainers can only be approved by an
              Admin.
            </Note>
          </Step>

          <Step
            n={2}
            title="Trainer approves the learner"
            who="Trainer or Admin"
          >
            <ol className="list-decimal pl-5 space-y-1">
              <li>
                Open{" "}
                <Link
                  href="/admin/signup-approvals"
                  className="text-indigo-400 hover:underline"
                >
                  Signup Approvals
                </Link>{" "}
                from the sidebar.
              </li>
              <li>
                Find the pending learner row and click <strong>Approve</strong>.
              </li>
              <li>
                The learner&rsquo;s status flips to <code>ACTIVE</code> and an
                expiry date is set automatically ({validityDays} days from now
                by default — see step 6).
              </li>
            </ol>
            <Note>
              Trainers can only approve <strong>LEARNER</strong> accounts.
              Pending trainer accounts are only visible / actionable by an
              Admin.
            </Note>
          </Step>

          <Step
            n={3}
            title="Trainer starts the container"
            who="Trainer or Admin"
          >
            <p>
              Containers default to <code>STOPPED</code>. Start them before
              class so learners get a working URL on first click.
            </p>
            <ol className="list-decimal pl-5 space-y-1">
              <li>
                <strong>Trainer:</strong> go to{" "}
                <Link
                  href="/dashboard/trainer"
                  className="text-indigo-400 hover:underline"
                >
                  My Environments
                </Link>{" "}
                and click <strong>Start</strong> on each container (or{" "}
                <strong>↻ Refresh all</strong> on an environment header to
                start every container in that environment).
              </li>
              <li>
                <strong>Admin:</strong> use{" "}
                <Link
                  href="/admin/containers"
                  className="text-indigo-400 hover:underline"
                >
                  Containers
                </Link>{" "}
                and click <strong>↻</strong> on the rows you want, or filter
                by environment and click{" "}
                <strong>↻ Refresh by environment</strong>.
              </li>
              <li>
                Wait for the status badge to settle on <code>RUNNING</code>.
                The container URL is now live.
              </li>
            </ol>
          </Step>

          <Step
            n={4}
            title="Trainer assigns the environment to the learner"
            who="Trainer or Admin"
          >
            <p>
              Access is granted per <strong>environment</strong>, not per
              container. Once a learner is assigned to an environment, they
              see every container under it on their dashboard.
            </p>
            <ol className="list-decimal pl-5 space-y-1">
              <li>
                Open{" "}
                <Link
                  href="/admin/users"
                  className="text-indigo-400 hover:underline"
                >
                  Users
                </Link>{" "}
                (labelled &ldquo;Learners&rdquo; in the trainer sidebar).
              </li>
              <li>
                Find the learner&rsquo;s row and click the{" "}
                <strong>Envs</strong> button.
              </li>
              <li>
                Tick the environments the learner should be able to use, then{" "}
                <strong>Save</strong>.
              </li>
              <li>
                The learner can now log in and see those environments on{" "}
                <code>/dashboard/learner</code>.
              </li>
            </ol>
            <Note>
              Trainers can only manage environment assignments for learners,
              not other trainers or admins.
            </Note>
          </Step>

          <Step
            n={5}
            title="The container auto-stops after inactivity"
            who="Automatic"
          >
            <p>
              Every time a learner clicks <strong>Access</strong> on a
              container, <code>lastAccessedAt</code> is updated. A scheduled
              job stops any container that has been idle for more than{" "}
              <strong>{IDLE_HOURS} hour{IDLE_HOURS === 1 ? "" : "s"}</strong>{" "}
              to free resources on the host.
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>
                Stopped containers show status <code>STOPPED</code> on
                everyone&rsquo;s dashboard.
              </li>
              <li>
                A trainer (or the learner&rsquo;s next access click, depending
                on configuration) can start the container again — see step 3.
              </li>
              <li>
                Admins can review what got stopped under{" "}
                <Link
                  href="/admin/refresh-logs"
                  className="text-indigo-400 hover:underline"
                >
                  Refresh Logs
                </Link>
                .
              </li>
            </ul>
            <Note>
              The idle window is set by the <code>IDLE_AUTOSTOP_HOURS</code>{" "}
              env var on the Coolify app (currently <strong>{IDLE_HOURS}h</strong>).
              The job runs against{" "}
              <code>/api/admin/cleanup-idle</code>.
            </Note>
          </Step>

          <Step
            n={6}
            title="Learner account deactivates after the validity window"
            who="Automatic"
          >
            <p>
              On approval (step 2) every learner is given an{" "}
              <code>expiresAt</code> set to{" "}
              <strong>now + {validityDays} day{validityDays === 1 ? "" : "s"}</strong>.
              Once that date passes, the login endpoint rejects them with an
              &ldquo;account expired&rdquo; message — the row is left intact in
              the database but is effectively deactivated.
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>
                <strong>Change the default window:</strong> Admin →{" "}
                <Link
                  href="/admin/settings"
                  className="text-indigo-400 hover:underline"
                >
                  Settings
                </Link>{" "}
                → <code>default_signup_validity_days</code>. New approvals
                pick this up immediately; existing learners keep the expiry
                they were assigned at approval time.
              </li>
              <li>
                <strong>Extend an individual learner:</strong> Admin or
                Trainer → <Link href="/admin/users" className="text-indigo-400 hover:underline">Users</Link>{" "}
                → click <strong>Extend</strong> on the row. This pushes{" "}
                <code>expiresAt</code> forward.
              </li>
              <li>
                <strong>Trainers never expire.</strong> Whenever a user&rsquo;s
                role is set to <code>TRAINER</code> or <code>ADMIN</code>,
                their <code>expiresAt</code> is cleared.
              </li>
            </ul>
            <Note>
              Expiry only blocks <em>login</em>. It does not stop or delete
              running containers. Use the idle auto-stop (step 5) or refresh
              between classes to reclaim resources.
            </Note>
          </Step>

          <section className="rounded-xl border border-indigo-500/30 bg-indigo-500/10 p-5">
            <h2 className="font-semibold text-zinc-100 mb-2">
              At a glance
            </h2>
            <ol className="list-decimal pl-5 space-y-1 text-zinc-200">
              <li>Learner self-signs up → <code>PENDING</code>.</li>
              <li>Trainer/Admin approves → <code>ACTIVE</code>, {validityDays}-day expiry.</li>
              <li>Trainer/Admin starts the container → <code>RUNNING</code>.</li>
              <li>Trainer/Admin assigns the environment → learner can see it.</li>
              <li>Container idle &gt; {IDLE_HOURS}h → auto-stopped.</li>
              <li>Learner expiry hits → login blocked.</li>
            </ol>
          </section>
        </div>
      </div>
    </DashboardShell>
  );
}

function Step({
  n,
  title,
  who,
  children,
}: {
  n: number;
  title: string;
  who: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
      <div className="flex items-baseline gap-3 mb-3">
        <span className="inline-flex items-center justify-center min-w-8 h-8 px-2 rounded-full bg-indigo-500/20 text-indigo-300 font-semibold text-sm">
          {n}
        </span>
        <h2 className="font-semibold text-zinc-100 flex-1">{title}</h2>
        <span className="text-xs uppercase tracking-wide text-zinc-500">
          {who}
        </span>
      </div>
      <div className="space-y-3 text-zinc-300">{children}</div>
    </section>
  );
}

function Note({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-zinc-700 bg-zinc-800/40 p-3 text-xs text-zinc-300">
      ℹ️ {children}
    </div>
  );
}

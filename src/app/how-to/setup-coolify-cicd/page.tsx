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
          / Setup Coolify CI/CD
        </nav>

        <h1 className="text-2xl font-semibold mb-1">Setup Coolify CI/CD</h1>
        <p className="text-sm text-zinc-400 mb-8">
          Wire up a GitHub webhook so every push to <code>main</code> auto-builds
          and redeploys this app via Coolify. Total time: ~3 minutes.
        </p>

        <div className="space-y-8 text-sm leading-relaxed">
          {/* ---------------------------------------- */}
          <Step number={1} title="Open the Webhooks panel in Coolify">
            <p>
              In Coolify, navigate to your project →{" "}
              <code>tertiarytraining → production → tertiarytraining</code>{" "}
              application.
            </p>
            <p>
              In the left sidebar, click <strong>Webhooks</strong>.
            </p>
            <p>
              You&apos;ll see a section titled{" "}
              <strong>Manual Git Webhooks</strong> with rows for GitHub, GitLab,
              Bitbucket, and Gitea.
            </p>
          </Step>

          {/* ---------------------------------------- */}
          <Step number={2} title="Copy the GitHub webhook URL and secret">
            <p>From the GitHub row in Coolify, copy these two values:</p>
            <Kv k="GitHub URL" v="http://<coolify-host>:8000/webhooks/source/github/events/manual" />
            <Kv k="GitHub Webhook Secret" v="(click the eye icon to reveal)" />
            <p className="text-xs text-amber-200/80 bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
              ⚠️ Note the URL uses <code>http://</code> (not <code>https://</code>)
              and port <code>8000</code>. That&apos;s fine — GitHub can call it
              as long as port 8000 is open on the Coolify host&apos;s public
              firewall.
            </p>
          </Step>

          {/* ---------------------------------------- */}
          <Step number={3} title="Open the Add Webhook page in GitHub">
            <p>
              Either click the <strong>&quot;Webhook Configuration on
              GitHub&quot;</strong> button in Coolify (it deep-links to the
              right page), or open this URL manually:
            </p>
            <pre className="bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-xs overflow-x-auto">
              https://github.com/&lt;owner&gt;/&lt;repo&gt;/settings/hooks/new
            </pre>
          </Step>

          {/* ---------------------------------------- */}
          <Step number={4} title="Fill in the GitHub webhook form">
            <table className="w-full text-xs border border-zinc-800 rounded-lg overflow-hidden">
              <thead className="bg-zinc-900 text-zinc-400">
                <tr>
                  <th className="text-left px-3 py-2">Field</th>
                  <th className="text-left px-3 py-2">Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                <Row k="Payload URL" v="(paste the Coolify GitHub URL from Step 2)" />
                <Row k="Content type" v="application/json" />
                <Row k="Secret" v="(paste the Coolify Webhook Secret from Step 2)" />
                <Row k="SSL verification" v="Disable (the Coolify URL is http://, not https://)" />
                <Row k="Which events would you like to trigger this webhook?" v="Just the push event" />
                <Row k="Active" v="✓ checked" />
              </tbody>
            </table>
            <p>
              Click <strong>Add webhook</strong>.
            </p>
            <p>
              GitHub immediately sends a test <em>ping</em>. You should see a{" "}
              <span className="text-emerald-300">green ✅</span> next to the
              webhook in the list. If it&apos;s a{" "}
              <span className="text-rose-300">red ❌</span>, click the webhook →{" "}
              <strong>Recent Deliveries</strong> tab → expand the failed
              delivery to see the response — most often it&apos;s the SSL
              verification toggle.
            </p>
          </Step>

          {/* ---------------------------------------- */}
          <Step number={5} title="Verify with a real push">
            <p>From your laptop:</p>
            <pre className="bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-xs overflow-x-auto">
{`git commit --allow-empty -m "chore: webhook test"
git push`}
            </pre>
            <p>
              In Coolify, open the <strong>Deployments</strong> tab of the app.
              Within ~3 seconds a new entry should appear marked{" "}
              <code>Webhook</code> (instead of <code>Manual</code>). It will
              progress through <code>Queued → In Progress → Success</code> in
              about 1–3 minutes.
            </p>
            <p className="text-emerald-200/90 bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3">
              ✅ Done. Every push to <code>main</code> now auto-deploys.
            </p>
          </Step>

          {/* ---------------------------------------- */}
          <Section title="Troubleshooting">
            <Issue
              symptom="Red ❌ on the GitHub webhook ping"
              fix={
                <>
                  Edit the webhook → make sure <strong>SSL verification</strong>{" "}
                  is set to <strong>Disable</strong> (the Coolify URL is{" "}
                  <code>http://</code>). Then click <strong>Redeliver</strong>{" "}
                  on the failed delivery.
                </>
              }
            />
            <Issue
              symptom="Webhook returns 401 / signature mismatch"
              fix={
                <>
                  The <strong>Secret</strong> doesn&apos;t match. Re-reveal the
                  secret in Coolify (eye icon) and re-paste it into the GitHub
                  webhook config. Save and redeliver.
                </>
              }
            />
            <Issue
              symptom="GitHub says it can't reach the URL (timeout / connection refused)"
              fix={
                <>
                  Port <code>8000</code> on the Coolify host is blocked.
                  Check the VPS firewall / security group and allow inbound
                  TCP <code>8000</code> from anywhere (or from GitHub&apos;s
                  webhook IP ranges).
                </>
              }
            />
            <Issue
              symptom="Push succeeds but no deploy appears in Coolify"
              fix={
                <>
                  The Coolify app&apos;s <strong>Branch</strong>{" "}
                  (Configuration → Git Source) doesn&apos;t match the branch you
                  pushed to. Default branch is <code>main</code> — if you push
                  to another branch the webhook is ignored.
                </>
              }
            />
          </Section>

          {/* ---------------------------------------- */}
          <Section title="Rolling back a bad deploy">
            <p>
              Coolify keeps every successful image. Go to{" "}
              <strong>Deployments</strong> → pick the last green deploy → click{" "}
              <strong>Rollback</strong>. The container is recreated from the
              older image in a few seconds. Your DB is unchanged.
            </p>
          </Section>

          {/* ---------------------------------------- */}
          <Section title="Disabling auto-deploy temporarily">
            <p>
              If you need to pause auto-deploys (e.g. while debugging in prod):
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>
                <strong>GitHub side:</strong> Repo Settings → Webhooks → click
                the webhook → toggle <strong>Active</strong> off.
              </li>
              <li>
                <strong>Coolify side:</strong> App → Configuration →{" "}
                <strong>Webhooks</strong> → click <strong>Regenerate Secret</strong>{" "}
                (existing GitHub deliveries will start failing signature
                validation until you re-paste the new secret in GitHub).
              </li>
            </ul>
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

function Row({ k, v }: { k: string; v: string }) {
  return (
    <tr>
      <td className="px-3 py-2 text-zinc-400 align-top whitespace-nowrap">{k}</td>
      <td className="px-3 py-2 text-zinc-200">{v}</td>
    </tr>
  );
}

function Kv({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-baseline gap-2 text-xs">
      <span className="text-zinc-500 min-w-[140px]">{k}</span>
      <code className="text-zinc-200 break-all">{v}</code>
    </div>
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

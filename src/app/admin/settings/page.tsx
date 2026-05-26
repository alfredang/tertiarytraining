import { getSessionUser } from "@/lib/auth";
import { DashboardShell } from "@/components/DashboardShell";
import { adminNav } from "@/lib/adminNav";
import { SettingsForm } from "@/components/SettingsForm";

export default async function Page() {
  const user = (await getSessionUser())!;
  return (
    <DashboardShell user={{ name: user.name, email: user.email, role: user.role }} nav={adminNav}>
      <h1 className="text-2xl font-semibold mb-6">Settings</h1>
      <SettingsForm />
      <div className="space-y-6 max-w-2xl mt-6">
        <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
          <h2 className="font-semibold mb-2">System</h2>
          <dl className="grid grid-cols-2 gap-y-2 text-sm">
            <dt className="text-zinc-400">App name</dt>
            <dd>{process.env.NEXT_PUBLIC_APP_NAME ?? "Tertiary Training"}</dd>
            <dt className="text-zinc-400">Docker mode</dt>
            <dd>{process.env.DOCKER_HOST_MODE ?? "mock"}</dd>
            <dt className="text-zinc-400">Node env</dt>
            <dd>{process.env.NODE_ENV}</dd>
          </dl>
        </section>
        <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
          <h2 className="font-semibold mb-2">Branding</h2>
          <p className="text-sm text-zinc-400">
            Powered by{" "}
            <a href="https://www.tertiarycourses.com.sg" target="_blank" rel="noreferrer" className="text-indigo-400 hover:underline">
              Tertiary Infotech Academy Pte Ltd
            </a>
          </p>
        </section>
      </div>
    </DashboardShell>
  );
}

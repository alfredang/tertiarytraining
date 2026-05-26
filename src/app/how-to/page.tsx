import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { getEffectiveRole } from "@/lib/effectiveRole";
import { DashboardShell } from "@/components/DashboardShell";
import { navForRole } from "@/lib/adminNav";

const guides = [
  {
    href: "/how-to/setup-coolify-cicd",
    title: "Setup Coolify CI/CD",
    description:
      "Wire up a GitHub webhook so every push to main auto-deploys via Coolify. Step-by-step with screenshots.",
    icon: "⚙",
  },
  {
    href: "/how-to/wordpress-environment",
    title: "WordPress Environment",
    description:
      "How to log into the WordPress backend admin and how to refresh containers when learners break them.",
    icon: "⌬",
  },
  {
    href: "/how-to/enable-real-docker",
    title: "Enable Real Docker Control",
    description:
      "Switch from mock mode to dockerode so Refresh actually restores WordPress demos to a known good state with a one-shot bootstrap script.",
    icon: "⬢",
  },
];

export default async function Page() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const effectiveRole = await getEffectiveRole(user.role);
  return (
    <DashboardShell
      user={{ name: user.name, email: user.email, role: user.role }}
      nav={navForRole(effectiveRole)}
    >
      <h1 className="text-2xl font-semibold mb-1">How To Guides</h1>
      <p className="text-sm text-zinc-400 mb-6">
        Operational walkthroughs for managing this deployment.
      </p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {guides.map((g) => (
          <Link
            key={g.href}
            href={g.href}
            className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 hover:border-indigo-500/40 hover:bg-zinc-900/80 transition-colors"
          >
            <div className="text-2xl mb-2">{g.icon}</div>
            <h2 className="font-semibold text-zinc-100 mb-1">{g.title}</h2>
            <p className="text-sm text-zinc-400">{g.description}</p>
          </Link>
        ))}
      </div>
    </DashboardShell>
  );
}

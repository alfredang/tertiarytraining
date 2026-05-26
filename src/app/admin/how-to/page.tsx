import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { DashboardShell } from "@/components/DashboardShell";
import { adminNav } from "@/lib/adminNav";

const guides = [
  {
    href: "/admin/how-to/setup-coolify-cicd",
    title: "Setup Coolify CI/CD",
    description:
      "Wire up a GitHub webhook so every push to main auto-deploys via Coolify. Step-by-step with screenshots.",
    icon: "⚙",
  },
  {
    href: "/admin/how-to/wordpress-environment",
    title: "WordPress Environment",
    description:
      "How to log into the WordPress backend admin and how to refresh containers when learners break them.",
    icon: "⌬",
  },
];

export default async function Page() {
  const user = (await getSessionUser())!;
  return (
    <DashboardShell
      user={{ name: user.name, email: user.email, role: user.role }}
      nav={adminNav}
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

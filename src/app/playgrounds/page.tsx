import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { getEffectiveRole } from "@/lib/effectiveRole";
import { DashboardShell } from "@/components/DashboardShell";
import { navForRole } from "@/lib/adminNav";

const playgrounds = [
  {
    name: "Kubernetes",
    provider: "Killercoda",
    description:
      "Browser-based Kubernetes cluster — a ready kubectl environment, no setup. ~60-minute session.",
    url: "https://killercoda.com/playgrounds/scenario/kubernetes",
    icon: "☸",
  },
  {
    name: "Ubuntu",
    provider: "Killercoda",
    description:
      "Browser-based Ubuntu Linux shell. Practice commands, install packages with apt — no local VM needed.",
    url: "https://killercoda.com/playgrounds/scenario/ubuntu",
    icon: "▣",
  },
  {
    name: "Google Cloud Shell",
    provider: "Google Cloud",
    description:
      "A free Linux terminal in your browser with the gcloud CLI pre-installed. Requires a Google account.",
    url: "https://shell.cloud.google.com/?show=terminal",
    icon: "⛅",
  },
];

export default async function Page() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return (
    <DashboardShell
      user={{ name: user.name, email: user.email, role: user.role }}
      nav={navForRole(await getEffectiveRole(user.role))}
    >
      <h1 className="text-2xl font-semibold mb-1">Playgrounds</h1>
      <p className="text-sm text-zinc-400 mb-6">
        Free, browser-based sandboxes for hands-on practice. Each opens in a new
        tab — no install required. These run on external services, not on our
        servers.
      </p>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {playgrounds.map((p) => (
          <a
            key={p.name}
            href={p.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group rounded-xl border border-zinc-800 bg-zinc-900 p-5 flex flex-col gap-3 hover:border-indigo-500/50 hover:bg-zinc-900/70 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-zinc-800 grid place-items-center text-xl shrink-0">
                {p.icon}
              </div>
              <div>
                <h3 className="font-semibold text-zinc-100 leading-tight">{p.name}</h3>
                <div className="text-xs text-zinc-500">{p.provider}</div>
              </div>
            </div>
            <p className="text-sm text-zinc-400 flex-1">{p.description}</p>
            <span className="text-sm font-medium text-indigo-400 group-hover:underline">
              Open playground ↗
            </span>
          </a>
        ))}
      </div>
    </DashboardShell>
  );
}

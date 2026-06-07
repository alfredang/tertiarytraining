import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { getEffectiveRole } from "@/lib/effectiveRole";
import { DashboardShell } from "@/components/DashboardShell";
import { navForRole } from "@/lib/adminNav";

type Playground = { name: string; description: string; url: string; icon: string };
type Group = { provider: string; note: string; items: Playground[] };

const groups: Group[] = [
  {
    provider: "iximiuz Labs",
    note: "Full root shells with real tooling — boot in seconds, no sign-up to start.",
    items: [
      {
        name: "Docker",
        description: "A ready Docker host. Build images, run containers, try compose — all in the browser.",
        url: "https://labs.iximiuz.com/playgrounds/docker",
        icon: "🐳",
      },
      {
        name: "Ubuntu 26.04",
        description: "A fresh Ubuntu 26.04 root shell for general Linux practice and package installs.",
        url: "https://labs.iximiuz.com/playgrounds/ubuntu-26-04",
        icon: "▣",
      },
      {
        name: "Kubernetes (k8s-omni)",
        description: "A multi-tool Kubernetes cluster with kubectl, Helm and friends pre-installed.",
        url: "https://labs.iximiuz.com/playgrounds/k8s-omni",
        icon: "☸",
      },
      {
        name: "Kali Linux",
        description: "Kali rolling shell for offensive-security / CTF practice. Pull in toolsets as needed.",
        url: "https://labs.iximiuz.com/playgrounds/kali-linux",
        icon: "🛡",
      },
    ],
  },
  {
    provider: "Killercoda",
    note: "Browser-based scenarios, ~60-minute sessions, no login required.",
    items: [
      {
        name: "Kubernetes",
        description: "Browser-based Kubernetes cluster — a ready kubectl environment, no setup.",
        url: "https://killercoda.com/playgrounds/scenario/kubernetes",
        icon: "☸",
      },
      {
        name: "Ubuntu",
        description: "Browser-based Ubuntu Linux shell. Practice commands and install packages with apt.",
        url: "https://killercoda.com/playgrounds/scenario/ubuntu",
        icon: "▣",
      },
    ],
  },
  {
    provider: "Google Cloud",
    note: "Requires a Google account.",
    items: [
      {
        name: "Cloud Shell",
        description: "A free Linux terminal in your browser with the gcloud CLI pre-installed.",
        url: "https://shell.cloud.google.com/?show=terminal",
        icon: "⛅",
      },
    ],
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
      <p className="text-sm text-zinc-400 mb-8">
        Free, browser-based sandboxes for hands-on practice. Each opens in a new
        tab — no install required. These run on external services, not on our
        servers.
      </p>

      <div className="space-y-8">
        {groups.map((group) => (
          <section key={group.provider}>
            <div className="flex items-baseline justify-between gap-3 mb-3">
              <h2 className="font-semibold text-zinc-100">{group.provider}</h2>
              <span className="text-xs text-zinc-500">{group.note}</span>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {group.items.map((p) => (
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
                      <div className="text-xs text-zinc-500">{group.provider}</div>
                    </div>
                  </div>
                  <p className="text-sm text-zinc-400 flex-1">{p.description}</p>
                  <span className="text-sm font-medium text-indigo-400 group-hover:underline">
                    Open playground ↗
                  </span>
                </a>
              ))}
            </div>
          </section>
        ))}
      </div>
    </DashboardShell>
  );
}

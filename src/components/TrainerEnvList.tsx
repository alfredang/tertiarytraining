"use client";

import { useState } from "react";
import { useToast } from "./Toast";
import { EnvironmentCard } from "./EnvironmentCard";

type Env = {
  environmentId: string;
  environmentName: string;
  description: string;
  containers: { id: string; status: string; containerUrl: string }[];
};

// Environments that expose a free external playground as a fallback (or as
// the only option, for envs we don't self-host yet). Keyed by environment name.
const EXTERNAL_PLAYGROUNDS: Record<
  string,
  { label: string; url: string; description: string }
> = {
  Ubuntu: {
    label: "Ubuntu (Killercoda)",
    url: "https://killercoda.com/playgrounds/scenario/ubuntu",
    description:
      "Free browser-based Ubuntu playground hosted by Killercoda. Use as a fallback when all in-house demos are busy. No login required.",
  },
  Kubernetes: {
    label: "Kubernetes (Killercoda)",
    url: "https://killercoda.com/playgrounds/scenario/kubernetes",
    description:
      "Free browser-based Kubernetes cluster hosted by Killercoda. No setup, ~60 minute session. No login required.",
  },
};

export function TrainerEnvList({
  envs,
  viewerRole = "TRAINER",
}: {
  envs: Env[];
  viewerRole?: "TRAINER" | "ADMIN";
}) {
  const toast = useToast();
  const [busy, setBusy] = useState<string | null>(null);

  async function refreshEnv(environmentId: string) {
    setBusy(environmentId);
    const res = await fetch("/api/containers/refresh-by-environment", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ environmentId }),
    });
    setBusy(null);
    const data = await res.json();
    if (!res.ok) {
      toast.push("error", data.error ?? "Refresh failed");
      return;
    }
    toast.push("success", `Refreshed: ${data.success} ok, ${data.failure} failed`);
    location.reload();
  }

  if (envs.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-zinc-800 bg-zinc-900/40 p-10 text-center text-zinc-400">
        No environments assigned to you yet.
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {envs.map((env) => {
        const external = EXTERNAL_PLAYGROUNDS[env.environmentName];
        return (
          <section key={env.environmentId}>
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-zinc-100">{env.environmentName}</h2>
                <p className="text-xs text-zinc-500">{env.containers.length} container(s)</p>
              </div>
              {env.containers.length > 0 && (
                <button
                  className="btn btn-primary"
                  disabled={busy === env.environmentId}
                  onClick={() => refreshEnv(env.environmentId)}
                >
                  {busy === env.environmentId ? "Refreshing…" : `↻ Refresh all ${env.environmentName}`}
                </button>
              )}
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {env.containers.map((c) => (
                <EnvironmentCard
                  key={c.id}
                  viewerRole={viewerRole}
                  env={{
                    id: c.id,
                    name: env.environmentName,
                    description: env.description,
                    status: c.status,
                    containerUrl: c.containerUrl,
                  }}
                />
              ))}
              {external && <ExternalPlaygroundCard {...external} />}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function ExternalPlaygroundCard({
  label,
  url,
  description,
}: {
  label: string;
  url: string;
  description: string;
}) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer noopener"
      className="rounded-xl border border-dashed border-indigo-500/40 bg-indigo-500/5 p-5 flex flex-col gap-3 hover:border-indigo-400 hover:bg-indigo-500/10 transition-colors"
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-semibold text-zinc-100">{label}</h3>
        <span className="text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full border border-indigo-400/40 text-indigo-300">
          External
        </span>
      </div>
      <p className="text-sm text-zinc-400 line-clamp-3">{description}</p>
      <div className="mt-auto">
        <span className="btn btn-primary inline-flex">Open ↗</span>
      </div>
    </a>
  );
}

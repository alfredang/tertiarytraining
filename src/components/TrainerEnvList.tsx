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

export function TrainerEnvList({ envs }: { envs: Env[] }) {
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
      {envs.map((env) => (
        <section key={env.environmentId}>
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-zinc-100">{env.environmentName}</h2>
              <p className="text-xs text-zinc-500">{env.containers.length} container(s)</p>
            </div>
            <button
              className="btn btn-primary"
              disabled={busy === env.environmentId}
              onClick={() => refreshEnv(env.environmentId)}
            >
              {busy === env.environmentId ? "Refreshing…" : `↻ Refresh all ${env.environmentName}`}
            </button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {env.containers.map((c) => (
              <EnvironmentCard
                key={c.id}
                env={{
                  id: c.id,
                  name: env.environmentName,
                  description: env.description,
                  status: c.status,
                  containerUrl: c.containerUrl,
                }}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { StatusBadge } from "./StatusBadge";
import { useToast } from "./Toast";

export type EnvCardData = {
  id: string;
  name: string;
  description: string;
  status: string;
  containerUrl?: string | null;
};

export function EnvironmentCard({
  env,
  viewerRole,
}: {
  env: EnvCardData;
  viewerRole?: "LEARNER" | "TRAINER" | "ADMIN";
}) {
  const router = useRouter();
  const toast = useToast();
  const [status, setStatus] = useState(env.status);
  const [busy, setBusy] = useState(false);

  const isRunning = status === "RUNNING";
  const isTransition = status === "REFRESHING";
  const canControl = viewerRole === "ADMIN" || viewerRole === "TRAINER";

  async function trackAccess() {
    try {
      await fetch(`/api/containers/${env.id}/access`, { method: "POST" });
    } catch {
      // Non-fatal; the user is still trying to reach the container.
    }
  }

  async function startContainer() {
    setBusy(true);
    setStatus("REFRESHING");
    const res = await fetch(`/api/containers/${env.id}/start`, { method: "POST" });
    setBusy(false);
    const data = await res.json();
    if (!res.ok) {
      toast.push("error", data.error ?? "Start failed");
      setStatus("ERROR");
      return false;
    }
    setStatus("RUNNING");
    toast.push("success", `Started ${env.name}`);
    router.refresh();
    return true;
  }

  async function stopContainer() {
    setBusy(true);
    setStatus("REFRESHING");
    const res = await fetch(`/api/containers/${env.id}/stop`, { method: "POST" });
    setBusy(false);
    const data = await res.json();
    if (!res.ok) {
      toast.push("error", data.error ?? "Stop failed");
      return;
    }
    setStatus("STOPPED");
    toast.push("success", `Stopped ${env.name}`);
    router.refresh();
  }

  async function handleAccess() {
    await trackAccess();
    if (isRunning && env.containerUrl) {
      window.open(env.containerUrl, "_blank", "noopener,noreferrer");
      return;
    }
    if (canControl) {
      // Offer to start in-place. A fresh container takes ~20-30 s to be ready.
      if (confirm(`${env.name} is not running. Start it now?\n\nIt may take ~20-30 seconds before the lab is ready.`)) {
        const ok = await startContainer();
        if (ok && env.containerUrl) {
          // Give the container a few seconds to come up, then open
          setTimeout(() => {
            window.open(env.containerUrl!, "_blank", "noopener,noreferrer");
          }, 5000);
        }
      }
    } else {
      toast.push("info", "Container is not running. Please ask a trainer or admin to start it.");
    }
  }

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 flex flex-col gap-3 hover:border-zinc-700 transition-colors">
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-semibold text-zinc-100">{env.name}</h3>
        <StatusBadge status={status} />
      </div>
      <p className="text-sm text-zinc-400 line-clamp-3">{env.description}</p>
      {env.name === "WordPress" && isRunning && env.containerUrl && (
        <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-2.5 text-xs">
          <div className="text-zinc-500 mb-1">WordPress admin login</div>
          <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-zinc-300">
            <span>
              User: <code className="text-zinc-100">admin</code>
            </span>
            <span>
              Password: <code className="text-zinc-100">Tertiary12345</code>
            </span>
          </div>
          <a
            href={`${env.containerUrl.replace(/\/$/, "")}/wp-admin/`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 inline-block text-indigo-400 hover:underline"
          >
            Open wp-admin ↗
          </a>
        </div>
      )}
      <div className="mt-auto flex flex-wrap items-center gap-2">
        <button
          className="btn btn-primary"
          onClick={handleAccess}
          disabled={busy || isTransition}
          title={isRunning ? "Open the lab in a new tab" : "Not running"}
        >
          {isTransition ? "Working…" : isRunning ? "Access ↗" : "Access"}
        </button>
        {canControl && (
          <>
            {!isRunning && (
              <button
                className="btn btn-ghost text-xs py-1 px-2"
                onClick={startContainer}
                disabled={busy || isTransition}
              >
                ▶ Start
              </button>
            )}
            {isRunning && (
              <button
                className="btn btn-ghost text-xs py-1 px-2"
                onClick={stopContainer}
                disabled={busy || isTransition}
              >
                ■ Stop
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

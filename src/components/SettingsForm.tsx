"use client";

import { useEffect, useState } from "react";
import { useToast } from "./Toast";

export function SettingsForm() {
  const toast = useToast();
  const [days, setDays] = useState<number>(7);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((d) => setDays(d.defaultValidityDays ?? 7))
      .finally(() => setLoading(false));
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await fetch("/api/admin/settings", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ defaultValidityDays: days }),
    });
    setSaving(false);
    const data = await res.json();
    if (!res.ok) toast.push("error", data.error ?? "Save failed");
    else toast.push("success", `Default expiry set to ${data.defaultValidityDays} days`);
  }

  return (
    <form onSubmit={save} className="space-y-3 max-w-sm">
      <label className="text-xs text-zinc-400 block">
        Default account validity after signup (days)
      </label>
      <input
        type="number"
        min={1}
        max={3650}
        value={loading ? "" : days}
        onChange={(e) => setDays(Number(e.target.value))}
        disabled={loading}
        required
      />
      <p className="text-xs text-zinc-500">
        Applies to new learner signups. Trainer accounts never expire once
        approved. Existing users are not affected — admins/trainers can
        extend any account from the Users page.
      </p>
      <button className="btn btn-primary" disabled={loading || saving}>
        {saving ? "Saving…" : "Save"}
      </button>
    </form>
  );
}

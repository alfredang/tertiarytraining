"use client";

import { useEffect, useMemo, useState } from "react";
import { useToast } from "./Toast";
import { Modal, ConfirmDialog } from "./Modal";
import { StatusBadge } from "./StatusBadge";

type Env = { id: string; name: string; defaultPort: number; accessUrl: string };
type Container = {
  id: string;
  name: string;
  environmentId: string;
  environment: { name: string };
  containerUrl: string;
  port: number;
  status: string;
  lastRefreshedAt: string | null;
};

const empty = { name: "", environmentId: "", containerUrl: "", port: 8080 };

export function ContainersTable() {
  const toast = useToast();
  const [containers, setContainers] = useState<Container[]>([]);
  const [envs, setEnvs] = useState<Env[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Container | null>(null);
  const [form, setForm] = useState(empty);
  const [confirmDel, setConfirmDel] = useState<Container | null>(null);
  const [filterEnv, setFilterEnv] = useState("ALL");
  const [busy, setBusy] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const [c, e] = await Promise.all([
      fetch("/api/containers").then((r) => r.json()),
      fetch("/api/environments").then((r) => r.json()),
    ]);
    setContainers(c.containers ?? []);
    setEnvs(e.environments ?? []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  const filtered = useMemo(
    () => containers.filter((c) => (filterEnv === "ALL" ? true : c.environmentId === filterEnv)),
    [containers, filterEnv],
  );

  function openCreate() {
    setEditing(null);
    setForm({ ...empty, environmentId: envs[0]?.id ?? "", port: envs[0]?.defaultPort ?? 8080, containerUrl: envs[0]?.accessUrl ?? "" });
    setOpen(true);
  }
  function openEdit(c: Container) {
    setEditing(c);
    setForm({
      name: c.name,
      environmentId: c.environmentId,
      containerUrl: c.containerUrl,
      port: c.port,
    });
    setOpen(true);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const url = editing ? `/api/containers/${editing.id}` : "/api/containers";
    const method = editing ? "PUT" : "POST";
    // assignedUserId is intentionally omitted — access is managed via Environment assignments
    const body = { ...form, assignedUserId: null };
    const res = await fetch(url, { method, headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    const data = await res.json();
    if (!res.ok) { toast.push("error", data.error ?? "Save failed"); return; }
    toast.push("success", editing ? "Container updated" : "Container created");
    setOpen(false);
    load();
  }

  async function del() {
    if (!confirmDel) return;
    const res = await fetch(`/api/containers/${confirmDel.id}`, { method: "DELETE" });
    if (!res.ok) toast.push("error", "Delete failed");
    else { toast.push("success", "Container deleted"); load(); }
    setConfirmDel(null);
  }

  async function refresh(id: string) {
    setBusy(id);
    const res = await fetch(`/api/containers/${id}/refresh`, { method: "POST" });
    setBusy(null);
    if (!res.ok) toast.push("error", "Refresh failed");
    else { toast.push("success", "Container refreshed"); load(); }
  }

  async function refreshByEnv() {
    if (filterEnv === "ALL") { toast.push("info", "Pick an environment first"); return; }
    setBusy(filterEnv);
    const res = await fetch("/api/containers/refresh-by-environment", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ environmentId: filterEnv }),
    });
    setBusy(null);
    const data = await res.json();
    if (!res.ok) toast.push("error", data.error ?? "Refresh failed");
    else { toast.push("success", `Refreshed: ${data.success} ok, ${data.failure} failed`); load(); }
  }

  async function refreshAll() {
    setBusy("ALL");
    const res = await fetch("/api/containers/refresh-by-environment", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ all: true }),
    });
    setBusy(null);
    const data = await res.json();
    if (!res.ok) toast.push("error", data.error ?? "Refresh failed");
    else { toast.push("success", `Refreshed: ${data.success} ok, ${data.failure} failed`); load(); }
  }

  return (
    <div>
      <div className="mb-2 rounded-lg border border-zinc-700 bg-zinc-800/40 p-3 text-xs text-zinc-300">
        ℹ️ Access is managed per <strong>environment</strong>, not per container.
        Assign environments to users from{" "}
        <a href="/admin/users" className="text-indigo-400 hover:underline">
          Admin → Users → Envs
        </a>
        . Anyone assigned to an environment automatically sees every container under it.
      </div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <select value={filterEnv} onChange={(e) => setFilterEnv(e.target.value)} className="max-w-xs">
          <option value="ALL">All environments</option>
          {envs.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
        </select>
        <button className="btn btn-ghost" disabled={busy !== null || filterEnv === "ALL"} onClick={refreshByEnv}>
          ↻ Refresh by environment
        </button>
        <button className="btn btn-ghost" disabled={busy !== null} onClick={refreshAll}>↻ Refresh all</button>
        <div className="ml-auto">
          <button className="btn btn-primary" onClick={openCreate}>+ New container</button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-zinc-800">
        <table className="w-full text-sm">
          <thead className="bg-zinc-900 text-zinc-400">
            <tr>
              <th className="text-left px-4 py-2">Name</th>
              <th className="text-left px-4 py-2">Environment</th>
              <th className="text-left px-4 py-2">URL</th>
              <th className="text-left px-4 py-2">Status</th>
              <th className="text-left px-4 py-2">Refreshed</th>
              <th className="text-right px-4 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="px-4 py-6 text-center text-zinc-500">Loading…</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-6 text-center text-zinc-500">No containers.</td></tr>
            ) : filtered.map((c) => (
              <tr key={c.id} className="border-t border-zinc-800">
                <td className="px-4 py-2">{c.name}</td>
                <td className="px-4 py-2">{c.environment.name}</td>
                <td className="px-4 py-2 text-zinc-400">
                  <a href={c.containerUrl} target="_blank" rel="noreferrer" className="text-indigo-400 hover:underline">
                    {c.containerUrl}
                  </a>
                </td>
                <td className="px-4 py-2"><StatusBadge status={busy === c.id ? "REFRESHING" : c.status} /></td>
                <td className="px-4 py-2 text-zinc-400">{c.lastRefreshedAt ? new Date(c.lastRefreshedAt).toLocaleString() : "—"}</td>
                <td className="px-4 py-2 text-right whitespace-nowrap">
                  <button
                    className="btn btn-ghost py-1 px-2 text-xs"
                    disabled={busy === c.id}
                    onClick={() => refresh(c.id)}
                    title="Rebuild (recreate the container fresh)"
                  >
                    <span className={busy === c.id ? "inline-block animate-spin" : "inline-block"}>↻</span>
                    {busy === c.id ? " Building…" : ""}
                  </button>
                  <button className="btn btn-ghost py-1 px-2 text-xs ml-1" onClick={() => openEdit(c)}>Edit</button>
                  <button className="btn btn-danger py-1 px-2 text-xs ml-1" onClick={() => setConfirmDel(c)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? "Edit container" : "New container"}>
        <form onSubmit={submit} className="space-y-3">
          <div><label className="text-xs text-zinc-400">Name</label><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
          <div>
            <label className="text-xs text-zinc-400">Environment</label>
            <select value={form.environmentId} onChange={(e) => {
              const env = envs.find(x => x.id === e.target.value);
              setForm({ ...form, environmentId: e.target.value, port: env?.defaultPort ?? form.port, containerUrl: env?.accessUrl ?? form.containerUrl });
            }} required>
              <option value="" disabled>Select…</option>
              {envs.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs text-zinc-400">Container URL</label><input value={form.containerUrl} onChange={(e) => setForm({ ...form, containerUrl: e.target.value })} required /></div>
            <div><label className="text-xs text-zinc-400">Port</label><input type="number" value={form.port} onChange={(e) => setForm({ ...form, port: Number(e.target.value) })} required /></div>
          </div>
          <p className="text-xs text-zinc-500">
            Access is granted by assigning the container&apos;s environment to a user in{" "}
            <a href="/admin/users" className="text-indigo-400 hover:underline">Users → Envs</a>.
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn btn-ghost" onClick={() => setOpen(false)}>Cancel</button>
            <button className="btn btn-primary">{editing ? "Save" : "Create"}</button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!confirmDel}
        title="Delete container?"
        message={`Remove container "${confirmDel?.name}"? This will also stop the Docker container if running.`}
        confirmLabel="Delete"
        danger
        onConfirm={del}
        onCancel={() => setConfirmDel(null)}
      />
    </div>
  );
}

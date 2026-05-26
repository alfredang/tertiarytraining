"use client";

import { useEffect, useState } from "react";
import { useToast } from "./Toast";
import { Modal, ConfirmDialog } from "./Modal";
import { StatusBadge } from "./StatusBadge";

type Env = {
  id: string;
  name: string;
  description: string;
  dockerImage: string;
  defaultPort: number;
  accessUrl: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
};

const empty = { name: "", description: "", dockerImage: "", defaultPort: 8080, accessUrl: "", enabled: true };

export function EnvironmentsTable() {
  const toast = useToast();
  const [envs, setEnvs] = useState<Env[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Env | null>(null);
  const [form, setForm] = useState(empty);
  const [confirmDel, setConfirmDel] = useState<Env | null>(null);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/environments");
    const data = await res.json();
    setEnvs(data.environments ?? []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  function openCreate() { setEditing(null); setForm(empty); setOpen(true); }
  function openEdit(e: Env) {
    setEditing(e);
    setForm({ name: e.name, description: e.description, dockerImage: e.dockerImage, defaultPort: e.defaultPort, accessUrl: e.accessUrl, enabled: e.enabled });
    setOpen(true);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const url = editing ? `/api/environments/${editing.id}` : "/api/environments";
    const method = editing ? "PUT" : "POST";
    const res = await fetch(url, { method, headers: { "content-type": "application/json" }, body: JSON.stringify(form) });
    const data = await res.json();
    if (!res.ok) { toast.push("error", data.error ?? "Save failed"); return; }
    toast.push("success", editing ? "Environment updated" : "Environment created");
    setOpen(false);
    load();
  }

  async function toggleEnabled(e: Env) {
    const res = await fetch(`/api/environments/${e.id}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ enabled: !e.enabled }),
    });
    if (!res.ok) toast.push("error", "Update failed");
    else { toast.push("success", `Environment ${!e.enabled ? "enabled" : "disabled"}`); load(); }
  }

  async function del() {
    if (!confirmDel) return;
    const res = await fetch(`/api/environments/${confirmDel.id}`, { method: "DELETE" });
    if (!res.ok) toast.push("error", "Delete failed");
    else { toast.push("success", "Environment deleted"); load(); }
    setConfirmDel(null);
  }

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <button className="btn btn-primary" onClick={openCreate}>+ New environment</button>
      </div>
      <div className="overflow-x-auto rounded-xl border border-zinc-800">
        <table className="w-full text-sm">
          <thead className="bg-zinc-900 text-zinc-400">
            <tr>
              <th className="text-left px-4 py-2">Name</th>
              <th className="text-left px-4 py-2">Docker image</th>
              <th className="text-left px-4 py-2">Port</th>
              <th className="text-left px-4 py-2">Status</th>
              <th className="text-right px-4 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="px-4 py-6 text-center text-zinc-500">Loading…</td></tr>
            ) : envs.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-6 text-center text-zinc-500">No environments.</td></tr>
            ) : envs.map((e) => (
              <tr key={e.id} className="border-t border-zinc-800">
                <td className="px-4 py-2">
                  <div className="font-medium">{e.name}</div>
                  <div className="text-xs text-zinc-500 line-clamp-1">{e.description}</div>
                </td>
                <td className="px-4 py-2 text-zinc-400">{e.dockerImage}</td>
                <td className="px-4 py-2">{e.defaultPort}</td>
                <td className="px-4 py-2"><StatusBadge status={e.enabled ? "ACTIVE" : "SUSPENDED"} /></td>
                <td className="px-4 py-2 text-right whitespace-nowrap">
                  <button className="btn btn-ghost py-1 px-2 text-xs" onClick={() => toggleEnabled(e)}>{e.enabled ? "Disable" : "Enable"}</button>
                  <button className="btn btn-ghost py-1 px-2 text-xs ml-1" onClick={() => openEdit(e)}>Edit</button>
                  <button className="btn btn-danger py-1 px-2 text-xs ml-1" onClick={() => setConfirmDel(e)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? "Edit environment" : "New environment"}>
        <form onSubmit={submit} className="space-y-3">
          <div><label className="text-xs text-zinc-400">Name</label><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
          <div><label className="text-xs text-zinc-400">Description</label><textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required /></div>
          <div><label className="text-xs text-zinc-400">Docker image</label><input value={form.dockerImage} onChange={(e) => setForm({ ...form, dockerImage: e.target.value })} required /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs text-zinc-400">Default port</label><input type="number" value={form.defaultPort} onChange={(e) => setForm({ ...form, defaultPort: Number(e.target.value) })} required /></div>
            <div><label className="text-xs text-zinc-400">Access URL</label><input value={form.accessUrl} onChange={(e) => setForm({ ...form, accessUrl: e.target.value })} required /></div>
          </div>
          <label className="flex items-center gap-2 text-sm text-zinc-300">
            <input type="checkbox" className="w-auto" checked={form.enabled} onChange={(e) => setForm({ ...form, enabled: e.target.checked })} />
            Enabled
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn btn-ghost" onClick={() => setOpen(false)}>Cancel</button>
            <button className="btn btn-primary">{editing ? "Save" : "Create"}</button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!confirmDel}
        title="Delete environment?"
        message={`This will also delete all containers under "${confirmDel?.name}".`}
        confirmLabel="Delete"
        danger
        onConfirm={del}
        onCancel={() => setConfirmDel(null)}
      />
    </div>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import { useToast } from "./Toast";
import { Modal, ConfirmDialog } from "./Modal";
import { StatusBadge } from "./StatusBadge";
import { formatDate } from "@/lib/utils";

type Role = "LEARNER" | "TRAINER" | "ADMIN";
type Status = "PENDING" | "ACTIVE" | "SUSPENDED" | "REJECTED";

type User = {
  id: string;
  email: string;
  name: string;
  role: Role;
  status: Status;
  expiresAt: string | null;
  createdAt: string;
};

type Env = { id: string; name: string };

const empty = {
  email: "",
  name: "",
  password: "",
  role: "LEARNER" as Role,
  status: "ACTIVE" as Status,
};

export function UsersTable({ viewerRole }: { viewerRole: Role }) {
  const isAdmin = viewerRole === "ADMIN";
  const toast = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [envs, setEnvs] = useState<Env[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [filterRole, setFilterRole] = useState<string>("ALL");
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [form, setForm] = useState(empty);
  const [confirmDel, setConfirmDel] = useState<User | null>(null);
  const [resetUser, setResetUser] = useState<User | null>(null);
  const [resetPw, setResetPw] = useState("");
  const [extendUser, setExtendUser] = useState<User | null>(null);
  const [extendDays, setExtendDays] = useState(7);
  const [assignUser, setAssignUser] = useState<User | null>(null);
  const [assignSelected, setAssignSelected] = useState<Set<string>>(new Set());

  async function load() {
    setLoading(true);
    const [u, e] = await Promise.all([
      fetch("/api/users").then((r) => r.json()),
      fetch("/api/environments").then((r) => r.json()).catch(() => ({ environments: [] })),
    ]);
    setUsers(u.users ?? []);
    setEnvs(e.environments ?? []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    return users.filter((u) => {
      if (filterRole !== "ALL" && u.role !== filterRole) return false;
      if (filterStatus !== "ALL" && u.status !== filterStatus) return false;
      if (q) {
        const s = q.toLowerCase();
        if (!u.email.toLowerCase().includes(s) && !u.name.toLowerCase().includes(s)) return false;
      }
      return true;
    });
  }, [users, q, filterRole, filterStatus]);

  function openCreate() {
    setEditing(null);
    setForm(empty);
    setOpen(true);
  }
  function openEdit(u: User) {
    setEditing(u);
    setForm({ email: u.email, name: u.name, password: "", role: u.role, status: u.status });
    setOpen(true);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const url = editing ? `/api/users/${editing.id}` : "/api/users";
    const method = editing ? "PUT" : "POST";
    const body: Record<string, unknown> = { email: form.email, name: form.name, role: form.role, status: form.status };
    if (!editing) body.password = form.password;
    else if (form.password) body.password = form.password;
    const res = await fetch(url, { method, headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    const data = await res.json();
    if (!res.ok) { toast.push("error", data.error ?? "Save failed"); return; }
    toast.push("success", editing ? "User updated" : "User created");
    setOpen(false);
    load();
  }

  async function del() {
    if (!confirmDel) return;
    const res = await fetch(`/api/users/${confirmDel.id}`, { method: "DELETE" });
    if (!res.ok) toast.push("error", "Delete failed");
    else { toast.push("success", "User deleted"); load(); }
    setConfirmDel(null);
  }

  async function resetPassword() {
    if (!resetUser) return;
    const res = await fetch(`/api/users/${resetUser.id}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ password: resetPw }),
    });
    if (!res.ok) toast.push("error", "Reset failed");
    else { toast.push("success", "Password reset"); setResetUser(null); setResetPw(""); }
  }

  async function extend() {
    if (!extendUser) return;
    const res = await fetch("/api/admin/extend-user", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ userId: extendUser.id, days: extendDays }),
    });
    const data = await res.json();
    if (!res.ok) toast.push("error", data.error ?? "Extend failed");
    else { toast.push("success", `Extended — new expiry ${formatDate(data.expiresAt)}`); setExtendUser(null); load(); }
  }

  async function openAssign(u: User) {
    setAssignUser(u);
    setAssignSelected(new Set());
    const res = await fetch(`/api/users/${u.id}/environments`);
    const data = await res.json();
    setAssignSelected(new Set(data.environmentIds ?? []));
  }

  async function saveAssign() {
    if (!assignUser) return;
    const res = await fetch(`/api/users/${assignUser.id}/environments`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ environmentIds: Array.from(assignSelected) }),
    });
    if (!res.ok) toast.push("error", "Save failed");
    else { toast.push("success", "Environment assignments saved"); setAssignUser(null); }
  }

  function expiryCell(u: User) {
    if (u.role === "TRAINER") return <span className="text-zinc-500">never</span>;
    if (!u.expiresAt) return <span className="text-zinc-500">—</span>;
    const ms = new Date(u.expiresAt).getTime() - Date.now();
    const days = Math.ceil(ms / 86_400_000);
    const cls =
      ms < 0 ? "text-rose-300" : days <= 2 ? "text-amber-300" : "text-zinc-300";
    const label = ms < 0 ? `expired ${formatDate(u.expiresAt)}` : `${days}d (${formatDate(u.expiresAt)})`;
    return <span className={cls}>{label}</span>;
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <input
          placeholder="Search name or email…"
          className="max-w-xs"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        {isAdmin && (
          <select value={filterRole} onChange={(e) => setFilterRole(e.target.value)} className="max-w-[160px]">
            <option value="ALL">All roles</option>
            <option value="LEARNER">Learner</option>
            <option value="TRAINER">Trainer</option>
            <option value="ADMIN">Admin</option>
          </select>
        )}
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="max-w-[160px]">
          <option value="ALL">All statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="PENDING">Pending</option>
          <option value="SUSPENDED">Suspended</option>
          <option value="REJECTED">Rejected</option>
        </select>
        {isAdmin && (
          <div className="ml-auto">
            <button className="btn btn-primary" onClick={openCreate}>+ New user</button>
          </div>
        )}
      </div>

      <div className="overflow-x-auto rounded-xl border border-zinc-800">
        <table className="w-full text-sm">
          <thead className="bg-zinc-900 text-zinc-400">
            <tr>
              <th className="text-left px-4 py-2">Name</th>
              <th className="text-left px-4 py-2">Email</th>
              <th className="text-left px-4 py-2">Role</th>
              <th className="text-left px-4 py-2">Status</th>
              <th className="text-left px-4 py-2">Expiry</th>
              <th className="text-right px-4 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="px-4 py-6 text-center text-zinc-500">Loading…</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-6 text-center text-zinc-500">No users.</td></tr>
            ) : filtered.map((u) => (
              <tr key={u.id} className="border-t border-zinc-800 hover:bg-zinc-900/40">
                <td className="px-4 py-2">{u.name}</td>
                <td className="px-4 py-2 text-zinc-400">{u.email}</td>
                <td className="px-4 py-2">{u.role}</td>
                <td className="px-4 py-2"><StatusBadge status={u.status} /></td>
                <td className="px-4 py-2 text-xs">{expiryCell(u)}</td>
                <td className="px-4 py-2 text-right whitespace-nowrap">
                  <button className="btn btn-ghost py-1 px-2 text-xs" onClick={() => openAssign(u)}>Envs</button>
                  {u.role !== "TRAINER" && (
                    <button
                      className="btn btn-ghost py-1 px-2 text-xs ml-1"
                      onClick={() => { setExtendUser(u); setExtendDays(7); }}
                    >
                      Extend
                    </button>
                  )}
                  {isAdmin && (
                    <>
                      <button className="btn btn-ghost py-1 px-2 text-xs ml-1" onClick={() => openEdit(u)}>Edit</button>
                      <button className="btn btn-ghost py-1 px-2 text-xs ml-1" onClick={() => { setResetUser(u); setResetPw(""); }}>Reset PW</button>
                      <button className="btn btn-danger py-1 px-2 text-xs ml-1" onClick={() => setConfirmDel(u)}>Delete</button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create / Edit (admin only) */}
      <Modal open={open && isAdmin} onClose={() => setOpen(false)} title={editing ? "Edit user" : "Create user"}>
        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="text-xs text-zinc-400">Name</label>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div>
            <label className="text-xs text-zinc-400">Email</label>
            <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          </div>
          <div>
            <label className="text-xs text-zinc-400">{editing ? "New password (leave blank to keep)" : "Password"}</label>
            <input type="password" minLength={editing ? 0 : 8} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-zinc-400">Role</label>
              <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Role })}>
                <option value="LEARNER">Learner</option>
                <option value="TRAINER">Trainer</option>
                <option value="ADMIN">Admin</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-zinc-400">Status</label>
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as Status })}>
                <option value="ACTIVE">Active</option>
                <option value="PENDING">Pending</option>
                <option value="SUSPENDED">Suspended</option>
                <option value="REJECTED">Rejected</option>
              </select>
            </div>
          </div>
          {form.role === "TRAINER" && (
            <p className="text-xs text-zinc-500">
              Trainer accounts never expire while active. Set status to{" "}
              <strong>Suspended</strong> to deactivate a trainer.
            </p>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn btn-ghost" onClick={() => setOpen(false)}>Cancel</button>
            <button className="btn btn-primary">{editing ? "Save" : "Create"}</button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!confirmDel}
        title="Delete user?"
        message={`This will permanently remove ${confirmDel?.email}.`}
        confirmLabel="Delete"
        danger
        onConfirm={del}
        onCancel={() => setConfirmDel(null)}
      />

      <Modal open={!!resetUser} onClose={() => setResetUser(null)} title={`Reset password — ${resetUser?.email ?? ""}`}>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-zinc-400">New password</label>
            <input type="password" minLength={8} value={resetPw} onChange={(e) => setResetPw(e.target.value)} />
          </div>
          <div className="flex justify-end gap-2">
            <button className="btn btn-ghost" onClick={() => setResetUser(null)}>Cancel</button>
            <button className="btn btn-primary" onClick={resetPassword} disabled={resetPw.length < 8}>Reset</button>
          </div>
        </div>
      </Modal>

      <Modal open={!!extendUser} onClose={() => setExtendUser(null)} title={`Extend expiry — ${extendUser?.email ?? ""}`}>
        <div className="space-y-3">
          <p className="text-xs text-zinc-400">
            Current expiry: {extendUser ? expiryCell(extendUser) : "—"}
          </p>
          <div>
            <label className="text-xs text-zinc-400">Add days</label>
            <input
              type="number"
              min={1}
              max={3650}
              value={extendDays}
              onChange={(e) => setExtendDays(Number(e.target.value))}
            />
          </div>
          <div className="flex gap-1 flex-wrap text-xs">
            {[7, 14, 30, 90, 365].map((n) => (
              <button
                key={n}
                type="button"
                className="btn btn-ghost py-0.5 px-2 text-xs"
                onClick={() => setExtendDays(n)}
              >
                +{n}d
              </button>
            ))}
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button className="btn btn-ghost" onClick={() => setExtendUser(null)}>Cancel</button>
            <button className="btn btn-primary" onClick={extend}>Extend</button>
          </div>
        </div>
      </Modal>

      <Modal open={!!assignUser} onClose={() => setAssignUser(null)} title={`Assign environments — ${assignUser?.email ?? ""}`}>
        <div className="space-y-3">
          {envs.length === 0 ? (
            <p className="text-xs text-zinc-500">No environments yet.</p>
          ) : (
            <div className="max-h-72 overflow-y-auto rounded-lg border border-zinc-800 divide-y divide-zinc-800">
              {envs.map((env) => (
                <label
                  key={env.id}
                  className="flex items-center gap-2 px-3 py-2 hover:bg-zinc-800/40 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    className="w-auto"
                    checked={assignSelected.has(env.id)}
                    onChange={(e) => {
                      const next = new Set(assignSelected);
                      if (e.target.checked) next.add(env.id);
                      else next.delete(env.id);
                      setAssignSelected(next);
                    }}
                  />
                  <span className="text-sm">{env.name}</span>
                </label>
              ))}
            </div>
          )}
          <p className="text-xs text-zinc-500">
            The user will see (and for trainers, can refresh) all containers
            under each selected environment.
          </p>
          <div className="flex justify-end gap-2">
            <button className="btn btn-ghost" onClick={() => setAssignUser(null)}>Cancel</button>
            <button className="btn btn-primary" onClick={saveAssign}>Save</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

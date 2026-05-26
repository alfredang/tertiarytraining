"use client";

import { useEffect, useMemo, useState } from "react";
import { useToast } from "./Toast";
import { Modal, ConfirmDialog } from "./Modal";
import { StatusBadge } from "./StatusBadge";

type User = {
  id: string;
  email: string;
  name: string;
  role: "LEARNER" | "TRAINER" | "ADMIN";
  status: "PENDING" | "ACTIVE" | "SUSPENDED" | "REJECTED";
  createdAt: string;
};

const empty = { email: "", name: "", password: "", role: "LEARNER" as User["role"], status: "ACTIVE" as User["status"] };

export function UsersTable() {
  const toast = useToast();
  const [users, setUsers] = useState<User[]>([]);
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

  async function load() {
    setLoading(true);
    const res = await fetch("/api/users");
    const data = await res.json();
    setUsers(data.users ?? []);
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

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <input
          placeholder="Search name or email…"
          className="max-w-xs"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select value={filterRole} onChange={(e) => setFilterRole(e.target.value)} className="max-w-[160px]">
          <option value="ALL">All roles</option>
          <option value="LEARNER">Learner</option>
          <option value="TRAINER">Trainer</option>
          <option value="ADMIN">Admin</option>
        </select>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="max-w-[160px]">
          <option value="ALL">All statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="PENDING">Pending</option>
          <option value="SUSPENDED">Suspended</option>
          <option value="REJECTED">Rejected</option>
        </select>
        <div className="ml-auto">
          <button className="btn btn-primary" onClick={openCreate}>+ New user</button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-zinc-800">
        <table className="w-full text-sm">
          <thead className="bg-zinc-900 text-zinc-400">
            <tr>
              <th className="text-left px-4 py-2">Name</th>
              <th className="text-left px-4 py-2">Email</th>
              <th className="text-left px-4 py-2">Role</th>
              <th className="text-left px-4 py-2">Status</th>
              <th className="text-right px-4 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="px-4 py-6 text-center text-zinc-500">Loading…</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-6 text-center text-zinc-500">No users.</td></tr>
            ) : filtered.map((u) => (
              <tr key={u.id} className="border-t border-zinc-800 hover:bg-zinc-900/40">
                <td className="px-4 py-2">{u.name}</td>
                <td className="px-4 py-2 text-zinc-400">{u.email}</td>
                <td className="px-4 py-2">{u.role}</td>
                <td className="px-4 py-2"><StatusBadge status={u.status} /></td>
                <td className="px-4 py-2 text-right whitespace-nowrap">
                  <button className="btn btn-ghost py-1 px-2 text-xs" onClick={() => openEdit(u)}>Edit</button>
                  <button className="btn btn-ghost py-1 px-2 text-xs ml-1" onClick={() => { setResetUser(u); setResetPw(""); }}>Reset PW</button>
                  <button className="btn btn-danger py-1 px-2 text-xs ml-1" onClick={() => setConfirmDel(u)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? "Edit user" : "Create user"}>
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
              <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as User["role"] })}>
                <option value="LEARNER">Learner</option>
                <option value="TRAINER">Trainer</option>
                <option value="ADMIN">Admin</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-zinc-400">Status</label>
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as User["status"] })}>
                <option value="ACTIVE">Active</option>
                <option value="PENDING">Pending</option>
                <option value="SUSPENDED">Suspended</option>
                <option value="REJECTED">Rejected</option>
              </select>
            </div>
          </div>
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
    </div>
  );
}

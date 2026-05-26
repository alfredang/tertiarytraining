"use client";

import { useEffect, useState } from "react";
import { useToast } from "./Toast";
import { StatusBadge } from "./StatusBadge";

type PendingUser = {
  id: string;
  email: string;
  name: string;
  role: string;
  status: string;
  createdAt: string;
};

export function ApprovalsTable() {
  const toast = useToast();
  const [users, setUsers] = useState<PendingUser[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/users?status=PENDING");
    const data = await res.json();
    setUsers(data.users ?? []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function act(id: string, kind: "approve" | "reject") {
    const res = await fetch(`/api/admin/${kind}-user`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ userId: id }),
    });
    if (!res.ok) toast.push("error", "Action failed");
    else { toast.push("success", kind === "approve" ? "Approved" : "Rejected"); load(); }
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-zinc-800">
      <table className="w-full text-sm">
        <thead className="bg-zinc-900 text-zinc-400">
          <tr>
            <th className="text-left px-4 py-2">Name</th>
            <th className="text-left px-4 py-2">Email</th>
            <th className="text-left px-4 py-2">Role</th>
            <th className="text-left px-4 py-2">Status</th>
            <th className="text-left px-4 py-2">Submitted</th>
            <th className="text-right px-4 py-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr><td colSpan={6} className="px-4 py-6 text-center text-zinc-500">Loading…</td></tr>
          ) : users.length === 0 ? (
            <tr><td colSpan={6} className="px-4 py-6 text-center text-zinc-500">No pending signups.</td></tr>
          ) : users.map((u) => (
            <tr key={u.id} className="border-t border-zinc-800">
              <td className="px-4 py-2">{u.name}</td>
              <td className="px-4 py-2 text-zinc-400">{u.email}</td>
              <td className="px-4 py-2">{u.role}</td>
              <td className="px-4 py-2"><StatusBadge status={u.status} /></td>
              <td className="px-4 py-2 text-zinc-400">{new Date(u.createdAt).toLocaleString()}</td>
              <td className="px-4 py-2 text-right whitespace-nowrap">
                <button className="btn btn-primary py-1 px-2 text-xs" onClick={() => act(u.id, "approve")}>Approve</button>
                <button className="btn btn-danger py-1 px-2 text-xs ml-1" onClick={() => act(u.id, "reject")}>Reject</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

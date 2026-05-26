import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DashboardShell } from "@/components/DashboardShell";
import { adminNav } from "@/lib/adminNav";
import { StatusBadge } from "@/components/StatusBadge";

export default async function Page() {
  const user = (await getSessionUser())!;
  const logs = await prisma.refreshLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { user: { select: { email: true, name: true } } },
  });

  return (
    <DashboardShell user={{ name: user.name, email: user.email, role: user.role }} nav={adminNav}>
      <h1 className="text-2xl font-semibold mb-6">Refresh Logs</h1>
      <div className="overflow-x-auto rounded-xl border border-zinc-800">
        <table className="w-full text-sm">
          <thead className="bg-zinc-900 text-zinc-400">
            <tr>
              <th className="text-left px-4 py-2">When</th>
              <th className="text-left px-4 py-2">By</th>
              <th className="text-left px-4 py-2">Scope</th>
              <th className="text-left px-4 py-2">Target</th>
              <th className="text-left px-4 py-2">Status</th>
              <th className="text-left px-4 py-2">Message</th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-6 text-center text-zinc-500">No refresh events yet.</td></tr>
            ) : logs.map((l) => (
              <tr key={l.id} className="border-t border-zinc-800">
                <td className="px-4 py-2 text-zinc-400">{l.createdAt.toLocaleString()}</td>
                <td className="px-4 py-2">{l.user?.email ?? "—"}</td>
                <td className="px-4 py-2">{l.scope}</td>
                <td className="px-4 py-2 text-zinc-400">{l.targetId ?? l.environmentId ?? "—"}</td>
                <td className="px-4 py-2"><StatusBadge status={l.status === "OK" ? "ACTIVE" : l.status === "ERROR" ? "ERROR" : "REFRESHING"} /></td>
                <td className="px-4 py-2 text-zinc-400">{l.message ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </DashboardShell>
  );
}

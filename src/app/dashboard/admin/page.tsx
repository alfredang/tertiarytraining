import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DashboardShell } from "@/components/DashboardShell";
import { adminNav } from "@/lib/adminNav";

export default async function AdminOverview() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (user.role !== "ADMIN") redirect(`/dashboard/${user.role.toLowerCase()}`);

  const [users, pending, environments, containers, refreshes] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { status: "PENDING" } }),
    prisma.environment.count(),
    prisma.dockerContainer.count(),
    prisma.refreshLog.count(),
  ]);

  const cards = [
    { label: "Users", value: users, href: "/admin/users" },
    { label: "Pending Approvals", value: pending, href: "/admin/signup-approvals" },
    { label: "Environments", value: environments, href: "/admin/environments" },
    { label: "Containers", value: containers, href: "/admin/containers" },
    { label: "Refresh Events", value: refreshes, href: "/admin/refresh-logs" },
  ];

  return (
    <DashboardShell user={{ name: user.name, email: user.email, role: user.role }} nav={adminNav}>
      <h1 className="text-2xl font-semibold mb-6">Admin Overview</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {cards.map((c) => (
          <Link
            key={c.label}
            href={c.href}
            className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 hover:border-indigo-500/40 hover:bg-zinc-900/80 transition-colors"
          >
            <div className="text-xs uppercase tracking-wide text-zinc-500">{c.label}</div>
            <div className="mt-2 text-3xl font-semibold text-zinc-100">{c.value}</div>
          </Link>
        ))}
      </div>
    </DashboardShell>
  );
}

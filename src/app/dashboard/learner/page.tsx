import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DashboardShell } from "@/components/DashboardShell";
import { EnvironmentCard } from "@/components/EnvironmentCard";

export default async function LearnerDashboard() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (user.role !== "LEARNER" && user.role !== "ADMIN")
    redirect(`/dashboard/${user.role.toLowerCase()}`);

  // Learners see only containers in environments explicitly assigned to them
  // (via EnvironmentAssignment) OR containers individually assigned to them.
  // Admins previewing this dashboard see everything.
  let containers;
  if (user.role === "ADMIN") {
    containers = await prisma.dockerContainer.findMany({
      include: { environment: true },
      orderBy: [{ environment: { name: "asc" } }, { name: "asc" }],
    });
  } else {
    const assignments = await prisma.environmentAssignment.findMany({
      where: { userId: user.id },
      select: { environmentId: true },
    });
    const envIds = assignments.map((a) => a.environmentId);
    containers = await prisma.dockerContainer.findMany({
      where: {
        OR: [
          { assignedUserId: user.id },
          { environmentId: { in: envIds }, environment: { enabled: true } },
        ],
      },
      include: { environment: true },
      orderBy: [{ environment: { name: "asc" } }, { name: "asc" }],
    });
  }

  return (
    <DashboardShell
      user={{ name: user.name, email: user.email, role: user.role }}
      nav={[{ href: "/dashboard/learner", label: "My Environments", icon: "▣" }]}
    >
      <h1 className="text-2xl font-semibold mb-1">My Training Environments</h1>
      <p className="text-sm text-zinc-400 mb-6">Click Access to open the assigned environment in a new tab.</p>
      {containers.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-800 bg-zinc-900/40 p-10 text-center text-zinc-400">
          No environments have been assigned to you yet. Please wait for your trainer or administrator.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {containers.map((c) => (
            <EnvironmentCard
              key={c.id}
              env={{
                id: c.id,
                name: c.environment.name,
                description: c.environment.description,
                status: c.status,
                containerUrl: c.containerUrl,
              }}
            />
          ))}
        </div>
      )}
    </DashboardShell>
  );
}

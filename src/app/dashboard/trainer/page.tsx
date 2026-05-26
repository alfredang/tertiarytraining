import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DashboardShell } from "@/components/DashboardShell";
import { TrainerEnvList } from "@/components/TrainerEnvList";

export default async function TrainerDashboard() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (user.role !== "TRAINER" && user.role !== "ADMIN")
    redirect(`/dashboard/${user.role.toLowerCase()}`);

  // Admins previewing the trainer dashboard see every environment.
  const assignments = user.role === "ADMIN"
    ? (await prisma.environment.findMany({
        include: { containers: true },
      })).map((env) => ({ environment: env }))
    : await prisma.environmentAssignment.findMany({
        where: { userId: user.id },
        include: { environment: { include: { containers: true } } },
      });

  const envs = assignments.map((a) => ({
    environmentId: a.environment.id,
    environmentName: a.environment.name,
    description: a.environment.description,
    containers: a.environment.containers.map((c) => ({
      id: c.id,
      status: c.status,
      containerUrl: c.containerUrl,
    })),
  }));

  return (
    <DashboardShell
      user={{ name: user.name, email: user.email, role: user.role }}
      nav={[{ href: "/dashboard/trainer", label: "My Environments", icon: "▣" }]}
    >
      <h1 className="text-2xl font-semibold mb-1">Trainer Dashboard</h1>
      <p className="text-sm text-zinc-400 mb-6">Refresh all containers for an environment with one click.</p>
      <TrainerEnvList envs={envs} />
    </DashboardShell>
  );
}

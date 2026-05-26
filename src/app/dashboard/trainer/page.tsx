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

  // Trainers (and admins previewing) see every enabled environment by
  // default. If a trainer has explicit assignments, those still take
  // precedence and are deduped.
  const explicit = await prisma.environmentAssignment.findMany({
    where: { userId: user.id },
    include: { environment: { include: { containers: true } } },
  });
  const allEnabled = await prisma.environment.findMany({
    where: { enabled: true },
    include: { containers: true },
  });
  const seen = new Set<string>();
  const assignments: { environment: (typeof allEnabled)[number] }[] = [];
  for (const a of explicit) {
    if (a.environment.enabled && !seen.has(a.environment.id)) {
      assignments.push({ environment: a.environment });
      seen.add(a.environment.id);
    }
  }
  for (const env of allEnabled) {
    if (!seen.has(env.id)) {
      assignments.push({ environment: env });
      seen.add(env.id);
    }
  }

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

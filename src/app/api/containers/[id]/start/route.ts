import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { dockerService, hostContainerNamesFor } from "@/lib/docker";

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  // Admins and trainers can start containers (learners cannot).
  const { user, error, status } = await requireRole("ADMIN", "TRAINER");
  if (!user) return NextResponse.json({ error }, { status });

  const { id } = await ctx.params;
  const container = await prisma.dockerContainer.findUnique({
    where: { id },
    include: { environment: true },
  });
  if (!container) return NextResponse.json({ error: "Container not found" }, { status: 404 });

  // Trainers may only start environments they're assigned to.
  if (user.role === "TRAINER") {
    const assigned = await prisma.environmentAssignment.findFirst({
      where: { environmentId: container.environmentId, userId: user.id },
    });
    if (!assigned)
      return NextResponse.json({ error: "Forbidden — environment not assigned to you" }, { status: 403 });
  }

  await prisma.dockerContainer.update({
    where: { id },
    data: { status: "REFRESHING" }, // re-use REFRESHING as "transition"
  });

  const svc = dockerService();
  const names = hostContainerNamesFor({
    environmentName: container.environment.name,
    port: container.port,
  });

  try {
    for (const n of names) await svc.start(n);
    await prisma.dockerContainer.update({
      where: { id },
      data: {
        status: "RUNNING",
        lastAccessedAt: new Date(),
      },
    });
    return NextResponse.json({ ok: true, containerUrl: container.containerUrl });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await prisma.dockerContainer.update({ where: { id }, data: { status: "ERROR" } });
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

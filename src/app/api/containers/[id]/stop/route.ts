import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { dockerService } from "@/lib/docker";

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { user, error, status } = await requireRole("ADMIN", "TRAINER");
  if (!user) return NextResponse.json({ error }, { status });

  const { id } = await ctx.params;
  const container = await prisma.dockerContainer.findUnique({
    where: { id },
    include: { environment: true },
  });
  if (!container) return NextResponse.json({ error: "Container not found" }, { status: 404 });

  if (user.role === "TRAINER") {
    const assigned = await prisma.environmentAssignment.findFirst({
      where: { environmentId: container.environmentId, userId: user.id },
    });
    if (!assigned)
      return NextResponse.json({ error: "Forbidden — environment not assigned to you" }, { status: 403 });
  }

  const svc = dockerService();

  try {
    // On-demand: delete the container(s) entirely so a stopped lab leaves
    // nothing running and consumes zero memory.
    await svc.destroyLab({
      environmentName: container.environment.name,
      image: container.environment.dockerImage,
      name: container.name,
      port: container.port,
    });
    await prisma.dockerContainer.update({
      where: { id },
      data: { status: "STOPPED" },
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await prisma.dockerContainer.update({ where: { id }, data: { status: "ERROR" } });
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

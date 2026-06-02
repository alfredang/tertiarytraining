import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { refreshOneContainer } from "@/lib/refresh";

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  // Learners are forbidden; admin and trainer may refresh
  const { user, error, status } = await requireRole("ADMIN", "TRAINER");
  if (!user) return NextResponse.json({ error }, { status });
  const { id } = await ctx.params;

  // Trainers may only refresh containers in environments assigned to them.
  if (user.role === "TRAINER") {
    const container = await prisma.dockerContainer.findUnique({
      where: { id },
      select: { environmentId: true },
    });
    if (!container) return NextResponse.json({ error: "Container not found" }, { status: 404 });
    const assigned = await prisma.environmentAssignment.findFirst({
      where: { environmentId: container.environmentId, userId: user.id },
    });
    if (!assigned)
      return NextResponse.json({ error: "Forbidden — environment not assigned to you" }, { status: 403 });
  }

  const result = await refreshOneContainer(id, user.id);
  if (!result.ok) return NextResponse.json({ error: result.message }, { status: 500 });
  return NextResponse.json({ ok: true, containerUrl: result.containerUrl });
}

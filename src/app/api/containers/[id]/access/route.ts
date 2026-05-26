import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

/**
 * Called when a learner / trainer / admin clicks Access on a container card.
 * Records lastAccessedAt (used by the idle-cleanup job) and returns the URL.
 *
 * Does NOT start the container — the container must already be RUNNING
 * for the URL to work. The UI guides the user accordingly.
 */
export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const container = await prisma.dockerContainer.findUnique({
    where: { id },
    include: { environment: true },
  });
  if (!container) return NextResponse.json({ error: "Container not found" }, { status: 404 });

  // Non-admin users can only "access" containers in environments they
  // have an EnvironmentAssignment for.
  if (user.role !== "ADMIN") {
    const assigned = await prisma.environmentAssignment.findFirst({
      where: { environmentId: container.environmentId, userId: user.id },
    });
    if (!assigned) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.dockerContainer.update({
    where: { id },
    data: { lastAccessedAt: new Date() },
  });

  return NextResponse.json({
    ok: true,
    containerUrl: container.containerUrl,
    status: container.status,
  });
}

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { refreshByEnvironment } from "@/lib/refresh";

export async function POST(req: Request) {
  const { user, error, status } = await requireRole("ADMIN", "TRAINER");
  if (!user) return NextResponse.json({ error }, { status });

  const body = await req.json().catch(() => ({}));
  const all = body?.all === true;
  const environmentId = body?.environmentId as string | undefined;

  if (all) {
    if (user.role !== "ADMIN")
      return NextResponse.json({ error: "Only admin can refresh all" }, { status: 403 });
    const envs = await prisma.environment.findMany({ select: { id: true } });
    let success = 0, failure = 0;
    for (const e of envs) {
      const r = await refreshByEnvironment(e.id, user.id);
      success += r.success;
      failure += r.failure;
    }
    return NextResponse.json({ success, failure });
  }

  if (!environmentId)
    return NextResponse.json({ error: "environmentId is required" }, { status: 400 });

  if (user.role === "TRAINER") {
    // Trainers may only refresh environments explicitly assigned to them.
    const assigned = await prisma.environmentAssignment.findFirst({
      where: { environmentId, userId: user.id },
    });
    if (!assigned)
      return NextResponse.json({ error: "Forbidden — environment not assigned to you" }, { status: 403 });
  }

  const result = await refreshByEnvironment(environmentId, user.id);
  return NextResponse.json(result);
}

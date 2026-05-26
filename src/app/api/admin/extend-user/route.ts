import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";

export async function POST(req: Request) {
  const { user, error, status } = await requireRole("ADMIN", "TRAINER");
  if (!user) return NextResponse.json({ error }, { status });

  const body = await req.json().catch(() => ({}));
  const userId: string | undefined = body.userId;
  const days = Number(body.days);

  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });
  if (!Number.isFinite(days) || days <= 0 || days > 3650)
    return NextResponse.json({ error: "days must be a positive number" }, { status: 400 });

  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 });

  if (user.role === "TRAINER" && target.role !== "LEARNER")
    return NextResponse.json({ error: "Trainers may only extend learner accounts." }, { status: 403 });

  if (target.role === "TRAINER")
    return NextResponse.json({ error: "Trainer accounts do not expire." }, { status: 400 });

  // Extend from whichever is later: now, or the existing expiresAt.
  const base = target.expiresAt && target.expiresAt.getTime() > Date.now() ? target.expiresAt.getTime() : Date.now();
  const newExpiresAt = new Date(base + days * 24 * 60 * 60 * 1000);

  await prisma.user.update({ where: { id: userId }, data: { expiresAt: newExpiresAt } });
  await prisma.auditLog.create({
    data: {
      userId: user.id,
      action: "EXTEND_USER",
      entity: "User",
      entityId: userId,
      meta: { days, newExpiresAt: newExpiresAt.toISOString() },
    },
  });

  return NextResponse.json({ ok: true, expiresAt: newExpiresAt });
}

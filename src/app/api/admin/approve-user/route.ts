import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { expiryFromNow, getDefaultValidityDays } from "@/lib/settings";

export async function POST(req: Request) {
  const { user, error, status } = await requireRole("ADMIN", "TRAINER");
  if (!user) return NextResponse.json({ error }, { status });
  const { userId } = await req.json().catch(() => ({}));
  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 });

  // Trainers can only approve LEARNER signups, not other TRAINER or ADMIN.
  if (user.role === "TRAINER" && target.role !== "LEARNER")
    return NextResponse.json({ error: "Trainers may only approve learner signups." }, { status: 403 });

  // Trainers never expire; learners get a fresh validity window on approval if expired.
  let expiresAt = target.expiresAt;
  if (target.role === "TRAINER") {
    expiresAt = null;
  } else if (!expiresAt || expiresAt.getTime() < Date.now()) {
    expiresAt = expiryFromNow(await getDefaultValidityDays());
  }

  await prisma.user.update({
    where: { id: userId },
    data: { status: "ACTIVE", expiresAt },
  });
  await prisma.auditLog.create({
    data: { userId: user.id, action: "APPROVE_USER", entity: "User", entityId: userId },
  });
  return NextResponse.json({ ok: true });
}

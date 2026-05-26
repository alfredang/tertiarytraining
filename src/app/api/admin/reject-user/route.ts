import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";

export async function POST(req: Request) {
  const { user, error, status } = await requireRole("ADMIN", "TRAINER");
  if (!user) return NextResponse.json({ error }, { status });
  const { userId } = await req.json().catch(() => ({}));
  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 });
  if (user.role === "TRAINER" && target.role !== "LEARNER")
    return NextResponse.json({ error: "Trainers may only reject learner signups." }, { status: 403 });

  await prisma.user.update({ where: { id: userId }, data: { status: "REJECTED" } });
  await prisma.auditLog.create({
    data: { userId: user.id, action: "REJECT_USER", entity: "User", entityId: userId },
  });
  return NextResponse.json({ ok: true });
}

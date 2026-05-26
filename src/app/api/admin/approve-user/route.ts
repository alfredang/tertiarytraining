import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";

export async function POST(req: Request) {
  const { user, error, status } = await requireRole("ADMIN");
  if (!user) return NextResponse.json({ error }, { status });
  const { userId } = await req.json().catch(() => ({}));
  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });
  await prisma.user.update({ where: { id: userId }, data: { status: "ACTIVE" } });
  await prisma.auditLog.create({
    data: { userId: user.id, action: "APPROVE_USER", entity: "User", entityId: userId },
  });
  return NextResponse.json({ ok: true });
}

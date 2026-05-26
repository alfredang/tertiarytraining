import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, hashPassword } from "@/lib/auth";
import { userUpdateSchema } from "@/lib/validation";

export async function PUT(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { user, error, status } = await requireRole("ADMIN");
  if (!user) return NextResponse.json({ error }, { status });
  const { id } = await ctx.params;
  const parsed = userUpdateSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  const { password, expiresAt, ...rest } = parsed.data;
  const data: Record<string, unknown> = { ...rest };
  if (password) data.passwordHash = await hashPassword(password);
  if (expiresAt !== undefined) data.expiresAt = expiresAt === null ? null : new Date(expiresAt);
  // If role is being changed to TRAINER, clear expiry (trainers don't expire).
  if (data.role === "TRAINER") data.expiresAt = null;
  const updated = await prisma.user.update({
    where: { id },
    data,
    select: { id: true, email: true, name: true, role: true, status: true, expiresAt: true },
  });
  return NextResponse.json({ user: updated });
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { user, error, status } = await requireRole("ADMIN");
  if (!user) return NextResponse.json({ error }, { status });
  const { id } = await ctx.params;
  if (id === user.id) return NextResponse.json({ error: "Cannot delete yourself" }, { status: 400 });
  await prisma.user.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

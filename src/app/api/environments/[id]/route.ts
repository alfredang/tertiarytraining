import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { environmentSchema } from "@/lib/validation";

export async function PUT(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { user, error, status } = await requireRole("ADMIN");
  if (!user) return NextResponse.json({ error }, { status });
  const { id } = await ctx.params;
  const body = await req.json().catch(() => ({}));
  const parsed = environmentSchema.partial().safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  const env = await prisma.environment.update({ where: { id }, data: parsed.data });
  return NextResponse.json({ environment: env });
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { user, error, status } = await requireRole("ADMIN");
  if (!user) return NextResponse.json({ error }, { status });
  const { id } = await ctx.params;
  await prisma.environment.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

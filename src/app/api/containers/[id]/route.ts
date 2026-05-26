import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { containerSchema } from "@/lib/validation";
import { dockerService } from "@/lib/docker";

export async function PUT(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { user, error, status } = await requireRole("ADMIN");
  if (!user) return NextResponse.json({ error }, { status });
  const { id } = await ctx.params;
  const parsed = containerSchema.partial().safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  const data = { ...parsed.data, assignedUserId: parsed.data.assignedUserId ?? null };
  const c = await prisma.dockerContainer.update({ where: { id }, data });
  return NextResponse.json({ container: c });
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { user, error, status } = await requireRole("ADMIN");
  if (!user) return NextResponse.json({ error }, { status });
  const { id } = await ctx.params;
  const existing = await prisma.dockerContainer.findUnique({ where: { id } });
  if (existing) {
    try { await dockerService().stopAndRemove(existing.name); } catch {}
  }
  await prisma.dockerContainer.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

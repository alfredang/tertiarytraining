import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";

// GET — list environment IDs assigned to a user (admin + trainer for learners)
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { user, error, status } = await requireRole("ADMIN", "TRAINER");
  if (!user) return NextResponse.json({ error }, { status });
  const { id } = await ctx.params;

  const target = await prisma.user.findUnique({ where: { id }, select: { id: true, role: true } });
  if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 });
  if (user.role === "TRAINER" && target.role !== "LEARNER")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const rows = await prisma.environmentAssignment.findMany({
    where: { userId: id },
    select: { environmentId: true },
  });
  return NextResponse.json({ environmentIds: rows.map((r) => r.environmentId) });
}

// PUT — replace the user's environment assignments with the given list
export async function PUT(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { user, error, status } = await requireRole("ADMIN", "TRAINER");
  if (!user) return NextResponse.json({ error }, { status });
  const { id } = await ctx.params;
  const body = await req.json().catch(() => ({}));
  const envIds: string[] = Array.isArray(body.environmentIds) ? body.environmentIds : [];

  const target = await prisma.user.findUnique({ where: { id }, select: { id: true, role: true } });
  if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 });
  if (user.role === "TRAINER" && target.role !== "LEARNER")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await prisma.$transaction([
    prisma.environmentAssignment.deleteMany({ where: { userId: id } }),
    ...envIds.map((envId) =>
      prisma.environmentAssignment.create({
        data: { userId: id, environmentId: envId },
      }),
    ),
  ]);

  return NextResponse.json({ ok: true, environmentIds: envIds });
}

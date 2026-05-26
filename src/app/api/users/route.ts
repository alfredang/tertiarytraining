import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, hashPassword } from "@/lib/auth";
import { userCreateSchema } from "@/lib/validation";

export async function GET(req: Request) {
  const { user, error, status } = await requireRole("ADMIN");
  if (!user) return NextResponse.json({ error }, { status });
  const { searchParams } = new URL(req.url);
  const statusFilter = searchParams.get("status") ?? undefined;
  const role = searchParams.get("role") ?? undefined;
  const users = await prisma.user.findMany({
    where: {
      ...(statusFilter ? { status: statusFilter as "PENDING" | "ACTIVE" | "SUSPENDED" | "REJECTED" } : {}),
      ...(role ? { role: role as "LEARNER" | "TRAINER" | "ADMIN" } : {}),
    },
    orderBy: { createdAt: "desc" },
    select: { id: true, email: true, name: true, role: true, status: true, createdAt: true },
  });
  return NextResponse.json({ users });
}

export async function POST(req: Request) {
  const { user, error, status } = await requireRole("ADMIN");
  if (!user) return NextResponse.json({ error }, { status });
  const parsed = userCreateSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  const exists = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (exists) return NextResponse.json({ error: "Email already exists" }, { status: 409 });
  const passwordHash = await hashPassword(parsed.data.password);
  const created = await prisma.user.create({
    data: {
      email: parsed.data.email,
      name: parsed.data.name,
      passwordHash,
      role: parsed.data.role,
      status: parsed.data.status ?? "ACTIVE",
    },
    select: { id: true, email: true, name: true, role: true, status: true, createdAt: true },
  });
  return NextResponse.json({ user: created });
}

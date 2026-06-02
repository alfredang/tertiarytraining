import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole, hashPassword } from "@/lib/auth";
import { userCreateSchema } from "@/lib/validation";

const roleQuerySchema = z.enum(["LEARNER", "TRAINER", "ADMIN"]);
const statusQuerySchema = z.enum(["PENDING", "ACTIVE", "SUSPENDED", "REJECTED"]);

export async function GET(req: Request) {
  const { user, error, status } = await requireRole("ADMIN", "TRAINER");
  if (!user) return NextResponse.json({ error }, { status });
  const { searchParams } = new URL(req.url);

  const rawStatus = searchParams.get("status");
  let statusFilter: z.infer<typeof statusQuerySchema> | undefined;
  if (rawStatus) {
    const parsed = statusQuerySchema.safeParse(rawStatus);
    if (!parsed.success) return NextResponse.json({ error: "Invalid status filter" }, { status: 400 });
    statusFilter = parsed.data;
  }

  // Trainers see only learners — their role filter is forced regardless of input.
  let roleFilter: z.infer<typeof roleQuerySchema> | undefined;
  if (user.role === "TRAINER") {
    roleFilter = "LEARNER";
  } else {
    const rawRole = searchParams.get("role");
    if (rawRole) {
      const parsed = roleQuerySchema.safeParse(rawRole);
      if (!parsed.success) return NextResponse.json({ error: "Invalid role filter" }, { status: 400 });
      roleFilter = parsed.data;
    }
  }

  const users = await prisma.user.findMany({
    where: {
      ...(statusFilter ? { status: statusFilter } : {}),
      ...(roleFilter ? { role: roleFilter } : {}),
    },
    orderBy: { createdAt: "desc" },
    select: { id: true, email: true, name: true, role: true, status: true, expiresAt: true, createdAt: true },
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
      // Trainers never expire — mirror the PUT route's invariant explicitly
      // so a future addition of expiresAt to userCreateSchema can't silently break it.
      ...(parsed.data.role === "TRAINER" ? { expiresAt: null } : {}),
    },
    select: { id: true, email: true, name: true, role: true, status: true, createdAt: true },
  });
  return NextResponse.json({ user: created });
}

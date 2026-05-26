import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { signupSchema } from "@/lib/validation";
import { hashPassword } from "@/lib/auth";

export async function POST(req: Request) {
  const parsed = signupSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  const { email, password, name } = parsed.data;
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return NextResponse.json({ error: "Email already registered" }, { status: 409 });
  const passwordHash = await hashPassword(password);
  // Trainers don't expire — expiresAt stays null.
  await prisma.user.create({
    data: { email, name, passwordHash, role: "TRAINER", status: "PENDING", expiresAt: null },
  });
  return NextResponse.json({ ok: true });
}

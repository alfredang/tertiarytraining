import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { loginSchema } from "@/lib/validation";
import { setSessionCookie, signSession, verifyPassword } from "@/lib/auth";

export async function POST(req: Request) {
  const parsed = loginSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const { email, password } = parsed.data;
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });

  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });

  if (user.status === "PENDING")
    return NextResponse.json({ error: "Your account is pending admin approval." }, { status: 403 });
  if (user.status === "REJECTED")
    return NextResponse.json({ error: "Your signup was rejected." }, { status: 403 });
  if (user.status === "SUSPENDED")
    return NextResponse.json({ error: "Your account is suspended." }, { status: 403 });
  if (user.role !== "TRAINER" && user.expiresAt && user.expiresAt.getTime() < Date.now())
    return NextResponse.json({ error: "Your account has expired. Please ask a trainer or admin to extend it." }, { status: 403 });

  const token = await signSession({ sub: user.id, email: user.email, name: user.name, role: user.role });
  await setSessionCookie(token);

  const redirect =
    user.role === "ADMIN" ? "/dashboard/admin" :
    user.role === "TRAINER" ? "/dashboard/trainer" : "/dashboard/learner";

  return NextResponse.json({ ok: true, redirect });
}

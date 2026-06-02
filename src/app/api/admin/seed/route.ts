import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";

/**
 * Bootstrap an initial admin user.
 * Gated by SEED_TOKEN to prevent abuse in deployed environments.
 *
 * Usage:
 *   curl -X POST $BASE/api/admin/seed \
 *     -H "x-seed-token: $SEED_TOKEN" \
 *     -H "content-type: application/json" \
 *     -d '{"email":"admin@you.com","password":"StrongPass!1","name":"Admin"}'
 */
export async function POST(req: Request) {
  const expected = process.env.SEED_TOKEN;
  if (!expected) return NextResponse.json({ error: "SEED_TOKEN not configured" }, { status: 500 });
  const provided = req.headers.get("x-seed-token") ?? "";
  const providedBuf = Buffer.from(provided);
  const expectedBuf = Buffer.from(expected);
  if (providedBuf.length !== expectedBuf.length || !timingSafeEqual(providedBuf, expectedBuf)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const email = (body.email ?? "admin@tertiary.local").toString();
  const password = (body.password ?? "ChangeMe123!").toString();
  const name = (body.name ?? "Administrator").toString();

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return NextResponse.json({ error: "Admin already exists" }, { status: 409 });

  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({
    data: { email, name, passwordHash, role: "ADMIN", status: "ACTIVE" },
    select: { id: true, email: true, role: true, status: true },
  });

  return NextResponse.json({ ok: true, user });
}

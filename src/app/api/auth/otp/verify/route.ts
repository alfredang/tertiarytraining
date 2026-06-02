import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { otpVerifySchema } from "@/lib/validation";
import { normalizeEmail, verifyOtpForEmail } from "@/lib/otp";
import { setSessionCookie, signSession } from "@/lib/auth";
import {
  expiryFromNow,
  getDefaultValidityDays,
  isOtpAutoSignupEnabled,
  isOtpLoginEnabled,
} from "@/lib/settings";
import { clientIp, rateLimit } from "@/lib/rateLimit";

export async function POST(req: Request) {
  if (!(await isOtpLoginEnabled())) {
    return NextResponse.json(
      { ok: false, error: "otp_disabled" },
      { status: 503 },
    );
  }

  const ip = clientIp(req);
  const ipGate = rateLimit(`otp:verify:ip:${ip}`, 30, 10 * 60_000);
  if (!ipGate.ok) {
    return NextResponse.json(
      { ok: false, error: "rate_limited", retryAfter: Math.ceil(ipGate.retryAfterMs / 1000) },
      { status: 429 },
    );
  }

  const parsed = otpVerifySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "invalid_input" }, { status: 400 });
  }

  const email = normalizeEmail(parsed.data.email);
  const code = parsed.data.code;

  const emailGate = rateLimit(`otp:verify:email:${email}`, 10, 10 * 60_000);
  if (!emailGate.ok) {
    return NextResponse.json(
      { ok: false, error: "rate_limited", retryAfter: Math.ceil(emailGate.retryAfterMs / 1000) },
      { status: 429 },
    );
  }

  const verify = await verifyOtpForEmail(email, code);
  if (!verify.ok) {
    await prisma.auditLog.create({
      data: {
        action: "OTP_VERIFY_FAIL",
        entity: "OtpCode",
        meta: { email, reason: verify.reason },
      },
    });
    const errorMap: Record<typeof verify.reason, string> = {
      not_found: "invalid_code",
      mismatch: "invalid_code",
      expired: "expired",
      locked: "too_many_attempts",
    };
    return NextResponse.json(
      { ok: false, error: errorMap[verify.reason] },
      { status: 400 },
    );
  }

  let user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    if (!(await isOtpAutoSignupEnabled())) {
      return NextResponse.json(
        { ok: false, error: "account_not_found" },
        { status: 404 },
      );
    }
    const days = await getDefaultValidityDays();
    user = await prisma.user.create({
      data: {
        email,
        name: email.split("@")[0],
        role: "LEARNER",
        status: "PENDING",
        expiresAt: expiryFromNow(days),
      },
    });
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "OTP_AUTO_SIGNUP",
        entity: "User",
        entityId: user.id,
        meta: { email },
      },
    });
  }

  if (user.status === "PENDING") {
    return NextResponse.json({ ok: true, pending: true });
  }
  if (user.status === "REJECTED") {
    return NextResponse.json(
      { ok: false, error: "account_rejected" },
      { status: 403 },
    );
  }
  if (user.status === "SUSPENDED") {
    return NextResponse.json(
      { ok: false, error: "account_suspended" },
      { status: 403 },
    );
  }
  if (
    user.role !== "TRAINER" &&
    user.expiresAt &&
    user.expiresAt.getTime() < Date.now()
  ) {
    return NextResponse.json(
      { ok: false, error: "account_expired" },
      { status: 403 },
    );
  }

  const token = await signSession({
    sub: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  });
  await setSessionCookie(token);

  await prisma.auditLog.create({
    data: {
      userId: user.id,
      action: "OTP_VERIFY_SUCCESS",
      entity: "User",
      entityId: user.id,
      meta: { email },
    },
  });

  const redirect =
    user.role === "ADMIN"
      ? "/dashboard/admin"
      : user.role === "TRAINER"
        ? "/dashboard/trainer"
        : "/dashboard/learner";

  return NextResponse.json({ ok: true, redirect });
}

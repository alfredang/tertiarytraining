import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { otpSendSchema } from "@/lib/validation";
import { createOtpForEmail, normalizeEmail, OTP_TTL_MINUTES } from "@/lib/otp";
import { renderTemplate, sendGmailOAuth } from "@/lib/email";
import { getOtpEmailTemplate, isOtpLoginEnabled } from "@/lib/settings";
import { clientIp, rateLimit } from "@/lib/rateLimit";

const SITE_URL = process.env.PUBLIC_BASE_URL ?? "https://www.tertiarytraining.com";

export async function POST(req: Request) {
  if (!(await isOtpLoginEnabled())) {
    return NextResponse.json(
      { ok: false, error: "otp_disabled" },
      { status: 503 },
    );
  }

  // IP-level throttle first — cheap, catches generic flood attempts before
  // we touch the DB or Gmail.
  const ip = clientIp(req);
  const ipGate = rateLimit(`otp:send:ip:${ip}`, 20, 10 * 60_000);
  if (!ipGate.ok) {
    return NextResponse.json(
      { ok: false, error: "rate_limited", retryAfter: Math.ceil(ipGate.retryAfterMs / 1000) },
      { status: 429 },
    );
  }

  const parsed = otpSendSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "invalid_email" }, { status: 400 });
  }

  const email = normalizeEmail(parsed.data.email);

  // Per-email throttle — caps how often any single account can be hit
  // with code-send requests, even from rotated IPs.
  const emailGate = rateLimit(`otp:send:email:${email}`, 3, 10 * 60_000);
  if (!emailGate.ok) {
    return NextResponse.json(
      { ok: false, error: "rate_limited", retryAfter: Math.ceil(emailGate.retryAfterMs / 1000) },
      { status: 429 },
    );
  }

  let code: string;
  try {
    const created = await createOtpForEmail(email);
    code = created.code;
  } catch (err) {
    console.error("[otp/send] failed to create OTP", err);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }

  const template = await getOtpEmailTemplate();
  const subject = renderTemplate(template.subject, {
    OTP: code,
    EXPIRY_MINUTES: String(OTP_TTL_MINUTES),
    USER_EMAIL: email,
    SITE_URL,
  });
  const body = renderTemplate(template.body, {
    OTP: code,
    EXPIRY_MINUTES: String(OTP_TTL_MINUTES),
    USER_EMAIL: email,
    SITE_URL,
  });

  let sendOk = true;
  try {
    await sendGmailOAuth({ to: email, subject, body });
  } catch (err) {
    sendOk = false;
    console.error("[otp/send] gmail send failed", err);
  }

  await prisma.auditLog.create({
    data: {
      action: sendOk ? "OTP_SEND" : "OTP_SEND_FAILED",
      entity: "OtpCode",
      meta: { email },
    },
  });

  // Gmail-level delivery failures (bad creds, network, quota) aren't
  // per-recipient, so surfacing them doesn't leak account existence —
  // and silently telling the user "code sent" when nothing was sent is
  // worse UX than admitting the system is broken.
  if (!sendOk) {
    return NextResponse.json(
      { ok: false, error: "delivery_failed" },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true });
}

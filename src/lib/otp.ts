import { randomInt } from "crypto";
import { prisma } from "./prisma";

export const OTP_TTL_MINUTES = 5;
const MAX_ATTEMPTS = 5;

export function generateOtp(): string {
  return randomInt(0, 1_000_000).toString().padStart(6, "0");
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export async function createOtpForEmail(
  email: string,
): Promise<{ code: string; expiresAt: Date }> {
  const normalized = normalizeEmail(email);
  const code = generateOtp();
  const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);

  await prisma.$transaction([
    prisma.otpCode.updateMany({
      where: { email: normalized, used: false },
      data: { used: true },
    }),
    prisma.otpCode.create({
      data: { email: normalized, code, expiresAt },
    }),
  ]);

  return { code, expiresAt };
}

export type VerifyOtpResult =
  | { ok: true }
  | { ok: false; reason: "not_found" | "expired" | "mismatch" | "locked" };

export async function verifyOtpForEmail(
  email: string,
  code: string,
): Promise<VerifyOtpResult> {
  const normalized = normalizeEmail(email);

  const latest = await prisma.otpCode.findFirst({
    where: { email: normalized, used: false },
    orderBy: { createdAt: "desc" },
  });

  if (!latest) return { ok: false, reason: "not_found" };
  if (latest.expiresAt.getTime() < Date.now()) {
    return { ok: false, reason: "expired" };
  }

  if (latest.code !== code) {
    const newAttempts = latest.attempts + 1;
    if (newAttempts >= MAX_ATTEMPTS) {
      // Lock the code so further guesses can't reach it. The user has to
      // request a fresh code (and pass the per-email send rate limit).
      await prisma.otpCode.update({
        where: { id: latest.id },
        data: { attempts: newAttempts, used: true },
      });
      return { ok: false, reason: "locked" };
    }
    await prisma.otpCode.update({
      where: { id: latest.id },
      data: { attempts: newAttempts },
    });
    return { ok: false, reason: "mismatch" };
  }

  await prisma.otpCode.update({
    where: { id: latest.id },
    data: { used: true },
  });

  return { ok: true };
}

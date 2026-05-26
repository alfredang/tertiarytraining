import { prisma } from "./prisma";

const DEFAULT_VALIDITY_DAYS = 7;
const KEY_VALIDITY_DAYS = "default_signup_validity_days";

export async function getDefaultValidityDays(): Promise<number> {
  const row = await prisma.systemSetting.findUnique({ where: { key: KEY_VALIDITY_DAYS } });
  if (!row) return DEFAULT_VALIDITY_DAYS;
  const n = Number(row.value);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_VALIDITY_DAYS;
}

export async function setDefaultValidityDays(days: number): Promise<void> {
  if (!Number.isFinite(days) || days <= 0 || days > 3650)
    throw new Error("days must be a positive number");
  await prisma.systemSetting.upsert({
    where: { key: KEY_VALIDITY_DAYS },
    update: { value: String(Math.floor(days)) },
    create: { key: KEY_VALIDITY_DAYS, value: String(Math.floor(days)) },
  });
}

export function expiryFromNow(days: number): Date {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

export function isExpired(expiresAt: Date | null | undefined): boolean {
  if (!expiresAt) return false;
  return expiresAt.getTime() < Date.now();
}

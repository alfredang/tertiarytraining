import { prisma } from "./prisma";

const DEFAULT_VALIDITY_DAYS = 7;
const KEY_VALIDITY_DAYS = "default_signup_validity_days";

const KEY_GOOGLE_CLIENT_ID = "google_oauth_client_id";
const KEY_GOOGLE_CLIENT_SECRET = "google_oauth_client_secret";
const KEY_GITHUB_CLIENT_ID = "github_oauth_client_id";
const KEY_GITHUB_CLIENT_SECRET = "github_oauth_client_secret";

async function getSettingValue(key: string): Promise<string | null> {
  const row = await prisma.systemSetting.findUnique({ where: { key } });
  return row?.value ?? null;
}

async function setSettingValue(key: string, value: string): Promise<void> {
  await prisma.systemSetting.upsert({
    where: { key },
    update: { value },
    create: { key, value },
  });
}

export async function getGoogleOAuthCredentials(): Promise<{ clientId: string; clientSecret: string } | null> {
  const clientId = await getSettingValue(KEY_GOOGLE_CLIENT_ID);
  const clientSecret = await getSettingValue(KEY_GOOGLE_CLIENT_SECRET);
  if (!clientId || !clientSecret) return null;
  return { clientId, clientSecret };
}

export async function setGoogleOAuthCredentials(clientId: string, clientSecret: string): Promise<void> {
  await setSettingValue(KEY_GOOGLE_CLIENT_ID, clientId);
  await setSettingValue(KEY_GOOGLE_CLIENT_SECRET, clientSecret);
}

export async function getGitHubOAuthCredentials(): Promise<{ clientId: string; clientSecret: string } | null> {
  const clientId = await getSettingValue(KEY_GITHUB_CLIENT_ID);
  const clientSecret = await getSettingValue(KEY_GITHUB_CLIENT_SECRET);
  if (!clientId || !clientSecret) return null;
  return { clientId, clientSecret };
}

export async function setGitHubOAuthCredentials(clientId: string, clientSecret: string): Promise<void> {
  await setSettingValue(KEY_GITHUB_CLIENT_ID, clientId);
  await setSettingValue(KEY_GITHUB_CLIENT_SECRET, clientSecret);
}

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

import { prisma } from "./prisma";

const DEFAULT_VALIDITY_DAYS = 7;
const KEY_VALIDITY_DAYS = "default_signup_validity_days";

const KEY_GOOGLE_CLIENT_ID = "google_oauth_client_id";
const KEY_GOOGLE_CLIENT_SECRET = "google_oauth_client_secret";
const KEY_GITHUB_CLIENT_ID = "github_oauth_client_id";
const KEY_GITHUB_CLIENT_SECRET = "github_oauth_client_secret";

const KEY_GMAIL_CLIENT_ID = "gmail_oauth_client_id";
const KEY_GMAIL_CLIENT_SECRET = "gmail_oauth_client_secret";
const KEY_GMAIL_REFRESH_TOKEN = "gmail_oauth_refresh_token";
const KEY_GMAIL_FROM_EMAIL = "gmail_from_email";
const KEY_GMAIL_FROM_NAME = "gmail_from_name";

const KEY_OTP_LOGIN_ENABLED = "otp_login_enabled";
const KEY_OTP_AUTO_SIGNUP_ENABLED = "otp_auto_signup_enabled";
const KEY_OTP_EMAIL_SUBJECT = "otp_email_subject";
const KEY_OTP_EMAIL_BODY = "otp_email_body";

const DEFAULT_OTP_SUBJECT = "Your Tertiary Training login code";
const DEFAULT_OTP_BODY =
  "Hi,\n\nYour one-time login code is {OTP}.\n\nIt expires in {EXPIRY_MINUTES} minutes. If you didn't request this code, you can safely ignore this email.\n\n— Tertiary Training\n{SITE_URL}";

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

export type GmailOAuthCredentials = {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  fromEmail: string;
  fromName: string;
};

export async function getGmailOAuthCredentials(): Promise<GmailOAuthCredentials | null> {
  const [clientId, clientSecret, refreshToken, fromEmail, fromName] = await Promise.all([
    getSettingValue(KEY_GMAIL_CLIENT_ID),
    getSettingValue(KEY_GMAIL_CLIENT_SECRET),
    getSettingValue(KEY_GMAIL_REFRESH_TOKEN),
    getSettingValue(KEY_GMAIL_FROM_EMAIL),
    getSettingValue(KEY_GMAIL_FROM_NAME),
  ]);
  if (!clientId || !clientSecret || !refreshToken || !fromEmail) return null;
  return { clientId, clientSecret, refreshToken, fromEmail, fromName: fromName ?? "Tertiary Training" };
}

export async function setGmailOAuthCredentials(c: GmailOAuthCredentials): Promise<void> {
  await setSettingValue(KEY_GMAIL_CLIENT_ID, c.clientId);
  await setSettingValue(KEY_GMAIL_CLIENT_SECRET, c.clientSecret);
  await setSettingValue(KEY_GMAIL_REFRESH_TOKEN, c.refreshToken);
  await setSettingValue(KEY_GMAIL_FROM_EMAIL, c.fromEmail);
  await setSettingValue(KEY_GMAIL_FROM_NAME, c.fromName);
}

export async function isOtpLoginEnabled(): Promise<boolean> {
  return (await getSettingValue(KEY_OTP_LOGIN_ENABLED)) === "true";
}

export async function isOtpAutoSignupEnabled(): Promise<boolean> {
  // Defaults to false (off) when unset — an admin must explicitly opt in
  // to letting OTP create new PENDING learner accounts.
  return (await getSettingValue(KEY_OTP_AUTO_SIGNUP_ENABLED)) === "true";
}

export async function setOtpLoginEnabled(enabled: boolean): Promise<void> {
  await setSettingValue(KEY_OTP_LOGIN_ENABLED, enabled ? "true" : "false");
}

export async function setOtpAutoSignupEnabled(enabled: boolean): Promise<void> {
  await setSettingValue(KEY_OTP_AUTO_SIGNUP_ENABLED, enabled ? "true" : "false");
}

export async function setOtpEmailTemplate(subject: string, body: string): Promise<void> {
  await setSettingValue(KEY_OTP_EMAIL_SUBJECT, subject);
  await setSettingValue(KEY_OTP_EMAIL_BODY, body);
}

export async function getOtpEmailTemplate(): Promise<{ subject: string; body: string }> {
  const [subject, body] = await Promise.all([
    getSettingValue(KEY_OTP_EMAIL_SUBJECT),
    getSettingValue(KEY_OTP_EMAIL_BODY),
  ]);
  return {
    subject: subject ?? DEFAULT_OTP_SUBJECT,
    body: body ?? DEFAULT_OTP_BODY,
  };
}

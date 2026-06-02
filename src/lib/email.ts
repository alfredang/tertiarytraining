import { google } from "googleapis";
import { getGmailOAuthCredentials } from "./settings";

type GmailClient = {
  oauth2: InstanceType<typeof google.auth.OAuth2>;
  fromEmail: string;
  fromName: string;
};

let cachedClient: GmailClient | null = null;
let cachedFingerprint: string | null = null;

async function getGmailClient() {
  const creds = await getGmailOAuthCredentials();
  if (!creds) return null;

  const fingerprint = `${creds.clientId}|${creds.refreshToken}|${creds.fromEmail}`;
  if (cachedClient && cachedFingerprint === fingerprint) return cachedClient;

  const oauth2 = new google.auth.OAuth2(creds.clientId, creds.clientSecret);
  oauth2.setCredentials({ refresh_token: creds.refreshToken });

  cachedClient = { oauth2, fromEmail: creds.fromEmail, fromName: creds.fromName };
  cachedFingerprint = fingerprint;
  return cachedClient;
}

export function renderTemplate(tpl: string, vars: Record<string, string>): string {
  return tpl.replace(/\{(\w+)\}/g, (_match, name) => vars[name] ?? `{${name}}`);
}

function base64UrlEncode(input: string): string {
  return Buffer.from(input, "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function buildRfc822({
  from,
  to,
  subject,
  body,
}: {
  from: string;
  to: string;
  subject: string;
  body: string;
}): string {
  const encodedSubject = `=?UTF-8?B?${Buffer.from(subject, "utf8").toString("base64")}?=`;
  const headers = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${encodedSubject}`,
    "MIME-Version: 1.0",
    'Content-Type: text/plain; charset="UTF-8"',
    "Content-Transfer-Encoding: 7bit",
  ];
  return headers.join("\r\n") + "\r\n\r\n" + body;
}

export async function sendGmailOAuth({
  to,
  subject,
  body,
}: {
  to: string;
  subject: string;
  body: string;
}): Promise<void> {
  const client = await getGmailClient();
  if (!client) throw new Error("Gmail OAuth credentials not configured");

  const fromHeader = client.fromName
    ? `${client.fromName} <${client.fromEmail}>`
    : client.fromEmail;
  const rfc822 = buildRfc822({ from: fromHeader, to, subject, body });
  const raw = base64UrlEncode(rfc822);

  const gmail = google.gmail({ version: "v1", auth: client.oauth2 });

  let lastErr: unknown;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      await gmail.users.messages.send({ userId: "me", requestBody: { raw } });
      return;
    } catch (err) {
      lastErr = err;
      const backoffMs = 500 * Math.pow(2, attempt);
      await new Promise((r) => setTimeout(r, backoffMs));
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error("Gmail send failed");
}

import { Google } from "arctic";
import { getGoogleOAuthCredentials } from "./settings";

const PUBLIC_BASE_URL = process.env.PUBLIC_BASE_URL ?? "https://www.tertiarytraining.com";

export function googleRedirectUri(): string {
  return `${PUBLIC_BASE_URL.replace(/\/$/, "")}/api/auth/callback/google`;
}

export async function getGoogleClient(): Promise<Google | null> {
  const creds = await getGoogleOAuthCredentials();
  if (!creds) return null;
  return new Google(creds.clientId, creds.clientSecret, googleRedirectUri());
}

export const OAUTH_STATE_COOKIE = "tt_oauth_state";
export const OAUTH_VERIFIER_COOKIE = "tt_oauth_verifier";

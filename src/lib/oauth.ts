import { Google, GitHub } from "arctic";
import { getGoogleOAuthCredentials, getGitHubOAuthCredentials } from "./settings";

const PUBLIC_BASE_URL = process.env.PUBLIC_BASE_URL ?? "https://www.tertiarytraining.com";

function callbackUrl(provider: string): string {
  return `${PUBLIC_BASE_URL.replace(/\/$/, "")}/api/auth/callback/${provider}`;
}

export function googleRedirectUri(): string {
  return callbackUrl("google");
}

export function githubRedirectUri(): string {
  return callbackUrl("github");
}

export async function getGoogleClient(): Promise<Google | null> {
  const creds = await getGoogleOAuthCredentials();
  if (!creds) return null;
  return new Google(creds.clientId, creds.clientSecret, googleRedirectUri());
}

export async function getGitHubClient(): Promise<GitHub | null> {
  const creds = await getGitHubOAuthCredentials();
  if (!creds) return null;
  return new GitHub(creds.clientId, creds.clientSecret, githubRedirectUri());
}

export const OAUTH_STATE_COOKIE = "tt_oauth_state";
export const OAUTH_VERIFIER_COOKIE = "tt_oauth_verifier";

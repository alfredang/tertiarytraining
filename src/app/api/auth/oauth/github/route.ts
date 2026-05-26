import { NextResponse } from "next/server";
import { generateState } from "arctic";
import { cookies } from "next/headers";
import { getGitHubClient, OAUTH_STATE_COOKIE } from "@/lib/oauth";

export async function GET() {
  const client = await getGitHubClient();
  if (!client) {
    return NextResponse.redirect(
      new URL(
        "/login?oauth_error=github_not_configured",
        process.env.PUBLIC_BASE_URL ?? "https://www.tertiarytraining.com",
      ),
    );
  }

  const state = generateState();
  // GitHub doesn't require PKCE; only state.
  const url = client.createAuthorizationURL(state, ["read:user", "user:email"]);

  const jar = await cookies();
  jar.set(OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 10,
  });

  return NextResponse.redirect(url.toString());
}

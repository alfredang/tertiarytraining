import { NextResponse } from "next/server";
import { generateState, generateCodeVerifier } from "arctic";
import { cookies } from "next/headers";
import { getGoogleClient, OAUTH_STATE_COOKIE, OAUTH_VERIFIER_COOKIE } from "@/lib/oauth";

export async function GET() {
  const client = await getGoogleClient();
  if (!client) {
    return NextResponse.redirect(
      new URL(
        "/login?oauth_error=google_not_configured",
        process.env.PUBLIC_BASE_URL ?? "https://www.tertiarytraining.com",
      ),
    );
  }

  const state = generateState();
  const codeVerifier = generateCodeVerifier();
  const url = client.createAuthorizationURL(state, codeVerifier, ["openid", "email", "profile"]);

  const jar = await cookies();
  const cookieOpts = {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 10, // 10 minutes
  };
  jar.set(OAUTH_STATE_COOKIE, state, cookieOpts);
  jar.set(OAUTH_VERIFIER_COOKIE, codeVerifier, cookieOpts);

  return NextResponse.redirect(url.toString());
}

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { setSessionCookie, signSession } from "@/lib/auth";
import { getGoogleClient, OAUTH_STATE_COOKIE, OAUTH_VERIFIER_COOKIE } from "@/lib/oauth";
import { expiryFromNow, getDefaultValidityDays } from "@/lib/settings";

const BASE = process.env.PUBLIC_BASE_URL ?? "https://www.tertiarytraining.com";

function redirectWithError(reason: string) {
  return NextResponse.redirect(new URL(`/login?oauth_error=${encodeURIComponent(reason)}`, BASE));
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const stateParam = url.searchParams.get("state");

  const jar = await cookies();
  const expectedState = jar.get(OAUTH_STATE_COOKIE)?.value;
  const verifier = jar.get(OAUTH_VERIFIER_COOKIE)?.value;
  jar.delete(OAUTH_STATE_COOKIE);
  jar.delete(OAUTH_VERIFIER_COOKIE);

  if (!code || !stateParam || !expectedState || !verifier) {
    return redirectWithError("missing_state");
  }
  if (stateParam !== expectedState) {
    return redirectWithError("state_mismatch");
  }

  const client = await getGoogleClient();
  if (!client) return redirectWithError("google_not_configured");

  let tokens;
  try {
    tokens = await client.validateAuthorizationCode(code, verifier);
  } catch {
    return redirectWithError("token_exchange_failed");
  }

  // Fetch the Google user profile
  const accessToken = tokens.accessToken();
  let profile: { sub: string; email: string; email_verified: boolean; name?: string };
  try {
    const res = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
      headers: { authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) throw new Error(`userinfo ${res.status}`);
    profile = await res.json();
  } catch {
    return redirectWithError("userinfo_failed");
  }

  if (!profile.email || !profile.email_verified) {
    return redirectWithError("email_not_verified");
  }

  // 1. Look up by googleId
  let user = await prisma.user.findUnique({ where: { googleId: profile.sub } });

  // 2. If not found, look up by email (link to existing email-signup user)
  if (!user) {
    user = await prisma.user.findUnique({ where: { email: profile.email } });
    if (user) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { googleId: profile.sub },
      });
    }
  }

  // 3. Brand new — create as PENDING learner
  if (!user) {
    const days = await getDefaultValidityDays();
    user = await prisma.user.create({
      data: {
        email: profile.email,
        name: profile.name ?? profile.email.split("@")[0],
        googleId: profile.sub,
        role: "LEARNER",
        status: "PENDING",
        expiresAt: expiryFromNow(days),
      },
    });
  }

  if (user.status === "PENDING") {
    return NextResponse.redirect(new URL("/login?oauth_pending=1", BASE));
  }
  if (user.status === "REJECTED") {
    return NextResponse.redirect(new URL("/login?oauth_error=account_rejected", BASE));
  }
  if (user.status === "SUSPENDED") {
    return NextResponse.redirect(new URL("/login?oauth_error=account_suspended", BASE));
  }
  if (user.role !== "TRAINER" && user.expiresAt && user.expiresAt.getTime() < Date.now()) {
    return NextResponse.redirect(new URL("/login?oauth_error=account_expired", BASE));
  }

  // Sign in
  const token = await signSession({
    sub: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  });
  await setSessionCookie(token);

  const redirect =
    user.role === "ADMIN" ? "/dashboard/admin" :
    user.role === "TRAINER" ? "/dashboard/trainer" : "/dashboard/learner";
  return NextResponse.redirect(new URL(redirect, BASE));
}

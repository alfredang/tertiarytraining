import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { setSessionCookie, signSession } from "@/lib/auth";
import { getGitHubClient, OAUTH_STATE_COOKIE } from "@/lib/oauth";
import { expiryFromNow, getDefaultValidityDays } from "@/lib/settings";

const BASE = process.env.PUBLIC_BASE_URL ?? "https://www.tertiarytraining.com";

function redirectWithError(reason: string) {
  return NextResponse.redirect(new URL(`/login?oauth_error=${encodeURIComponent(reason)}`, BASE));
}

type GitHubUser = {
  id: number;
  login: string;
  name?: string | null;
  email?: string | null;
};
type GitHubEmail = {
  email: string;
  primary: boolean;
  verified: boolean;
};

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const stateParam = url.searchParams.get("state");

  const jar = await cookies();
  const expectedState = jar.get(OAUTH_STATE_COOKIE)?.value;
  jar.delete(OAUTH_STATE_COOKIE);

  if (!code || !stateParam || !expectedState) return redirectWithError("missing_state");
  if (stateParam !== expectedState) return redirectWithError("state_mismatch");

  const client = await getGitHubClient();
  if (!client) return redirectWithError("github_not_configured");

  let tokens;
  try {
    tokens = await client.validateAuthorizationCode(code);
  } catch {
    return redirectWithError("token_exchange_failed");
  }

  const accessToken = tokens.accessToken();
  let profile: GitHubUser;
  let email: string | null = null;
  try {
    const userRes = await fetch("https://api.github.com/user", {
      headers: {
        authorization: `Bearer ${accessToken}`,
        accept: "application/vnd.github+json",
      },
    });
    if (!userRes.ok) throw new Error(`user ${userRes.status}`);
    profile = await userRes.json();

    // Email may be private; fetch /user/emails to get a verified primary
    email = profile.email ?? null;
    if (!email) {
      const emailRes = await fetch("https://api.github.com/user/emails", {
        headers: {
          authorization: `Bearer ${accessToken}`,
          accept: "application/vnd.github+json",
        },
      });
      if (emailRes.ok) {
        const emails: GitHubEmail[] = await emailRes.json();
        const primary = emails.find((e) => e.primary && e.verified) ?? emails.find((e) => e.verified);
        email = primary?.email ?? null;
      }
    }
  } catch {
    return redirectWithError("userinfo_failed");
  }

  if (!email) return redirectWithError("email_not_verified");

  const githubId = String(profile.id);

  let user = await prisma.user.findUnique({ where: { githubId } });
  if (!user) {
    user = await prisma.user.findUnique({ where: { email } });
    if (user) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { githubId },
      });
    }
  }
  if (!user) {
    const days = await getDefaultValidityDays();
    user = await prisma.user.create({
      data: {
        email,
        name: profile.name ?? profile.login,
        githubId,
        role: "LEARNER",
        status: "PENDING",
        expiresAt: expiryFromNow(days),
      },
    });
  }

  if (user.status === "PENDING")
    return NextResponse.redirect(new URL("/login?oauth_pending=1", BASE));
  if (user.status === "REJECTED")
    return NextResponse.redirect(new URL("/login?oauth_error=account_rejected", BASE));
  if (user.status === "SUSPENDED")
    return NextResponse.redirect(new URL("/login?oauth_error=account_suspended", BASE));
  if (user.role !== "TRAINER" && user.expiresAt && user.expiresAt.getTime() < Date.now())
    return NextResponse.redirect(new URL("/login?oauth_error=account_expired", BASE));

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

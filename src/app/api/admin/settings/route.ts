import { NextResponse } from "next/server";
import { requireRole, getSessionUser } from "@/lib/auth";
import {
  getDefaultValidityDays,
  setDefaultValidityDays,
  getGoogleOAuthCredentials,
  setGoogleOAuthCredentials,
  getGitHubOAuthCredentials,
  setGitHubOAuthCredentials,
} from "@/lib/settings";

function maskSecret(s: string | null | undefined): string | null {
  if (!s) return null;
  if (s.length < 8) return "•".repeat(s.length);
  return s.slice(0, 4) + "•".repeat(Math.max(8, s.length - 8)) + s.slice(-4);
}

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const defaultValidityDays = await getDefaultValidityDays();

  // Only admins see OAuth credentials (and even then, only masked secrets).
  const payload: Record<string, unknown> = { defaultValidityDays };
  if (user.role === "ADMIN") {
    const google = await getGoogleOAuthCredentials();
    const github = await getGitHubOAuthCredentials();
    payload.google = google
      ? { clientId: google.clientId, clientSecretMasked: maskSecret(google.clientSecret), configured: true }
      : { clientId: "", clientSecretMasked: null, configured: false };
    payload.github = github
      ? { clientId: github.clientId, clientSecretMasked: maskSecret(github.clientSecret), configured: true }
      : { clientId: "", clientSecretMasked: null, configured: false };
  }
  return NextResponse.json(payload);
}

export async function POST(req: Request) {
  const { user, error, status } = await requireRole("ADMIN");
  if (!user) return NextResponse.json({ error }, { status });
  const body = await req.json().catch(() => ({}));

  // Default expiry days (optional)
  if (body.defaultValidityDays != null) {
    const days = Number(body.defaultValidityDays);
    if (!Number.isFinite(days) || days <= 0 || days > 3650)
      return NextResponse.json({ error: "defaultValidityDays must be a positive number" }, { status: 400 });
    await setDefaultValidityDays(days);
  }

  // Google OAuth (optional). If clientSecret is blank/omitted, the
  // existing value is preserved — lets admin update client_id without
  // re-pasting the secret each time.
  if (body.google && typeof body.google === "object") {
    const { clientId, clientSecret } = body.google as { clientId?: string; clientSecret?: string };
    if (clientId !== undefined) {
      const finalSecret = clientSecret && clientSecret.trim().length > 0
        ? clientSecret.trim()
        : (await getGoogleOAuthCredentials())?.clientSecret ?? "";
      if (clientId.trim().length === 0) {
        return NextResponse.json({ error: "Google clientId cannot be blank" }, { status: 400 });
      }
      if (!finalSecret) {
        return NextResponse.json({ error: "Google clientSecret missing — paste it once when first configuring." }, { status: 400 });
      }
      await setGoogleOAuthCredentials(clientId.trim(), finalSecret);
    }
  }

  // GitHub OAuth (optional, same pattern)
  if (body.github && typeof body.github === "object") {
    const { clientId, clientSecret } = body.github as { clientId?: string; clientSecret?: string };
    if (clientId !== undefined) {
      const finalSecret = clientSecret && clientSecret.trim().length > 0
        ? clientSecret.trim()
        : (await getGitHubOAuthCredentials())?.clientSecret ?? "";
      if (clientId.trim().length === 0) {
        return NextResponse.json({ error: "GitHub clientId cannot be blank" }, { status: 400 });
      }
      if (!finalSecret) {
        return NextResponse.json({ error: "GitHub clientSecret missing — paste it once when first configuring." }, { status: 400 });
      }
      await setGitHubOAuthCredentials(clientId.trim(), finalSecret);
    }
  }

  return NextResponse.json({ ok: true });
}

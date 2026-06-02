"use client";

import { useEffect, useState } from "react";
import { useToast } from "./Toast";

type OAuthState = {
  clientId: string;
  clientSecretMasked: string | null;
  configured: boolean;
};

type GmailState = {
  clientId: string;
  clientSecretMasked: string | null;
  refreshTokenMasked: string | null;
  fromEmail: string;
  fromName: string;
  configured: boolean;
};

type OtpState = {
  loginEnabled: boolean;
  autoSignupEnabled: boolean;
  template: { subject: string; body: string };
};

type Section = "expiry" | "google" | "github" | "gmail" | "otp" | "otpTemplate";

export function SettingsForm() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<Section | null>(null);

  const [days, setDays] = useState<number>(7);

  const [google, setGoogle] = useState<OAuthState>({ clientId: "", clientSecretMasked: null, configured: false });
  const [googleSecretInput, setGoogleSecretInput] = useState("");

  const [github, setGithub] = useState<OAuthState>({ clientId: "", clientSecretMasked: null, configured: false });
  const [githubSecretInput, setGithubSecretInput] = useState("");

  const [gmail, setGmail] = useState<GmailState>({
    clientId: "",
    clientSecretMasked: null,
    refreshTokenMasked: null,
    fromEmail: "",
    fromName: "Tertiary Training",
    configured: false,
  });
  const [gmailSecretInput, setGmailSecretInput] = useState("");
  const [gmailRefreshInput, setGmailRefreshInput] = useState("");

  const [otp, setOtp] = useState<OtpState>({
    loginEnabled: false,
    autoSignupEnabled: false,
    template: { subject: "", body: "" },
  });

  function refresh() {
    return fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((d) => {
        setDays(d.defaultValidityDays ?? 7);
        if (d.google) setGoogle(d.google);
        if (d.github) setGithub(d.github);
        if (d.gmail) setGmail(d.gmail);
        if (d.otp) setOtp(d.otp);
      });
  }

  useEffect(() => {
    refresh().finally(() => setLoading(false));
  }, []);

  async function saveSection(section: Section) {
    setSaving(section);
    const body: Record<string, unknown> = {};
    if (section === "expiry") body.defaultValidityDays = days;
    if (section === "google") {
      body.google = { clientId: google.clientId };
      if (googleSecretInput.trim()) (body.google as Record<string, string>).clientSecret = googleSecretInput.trim();
    }
    if (section === "github") {
      body.github = { clientId: github.clientId };
      if (githubSecretInput.trim()) (body.github as Record<string, string>).clientSecret = githubSecretInput.trim();
    }
    if (section === "gmail") {
      const g: Record<string, string> = {
        clientId: gmail.clientId,
        fromEmail: gmail.fromEmail,
        fromName: gmail.fromName,
      };
      if (gmailSecretInput.trim()) g.clientSecret = gmailSecretInput.trim();
      if (gmailRefreshInput.trim()) g.refreshToken = gmailRefreshInput.trim();
      body.gmail = g;
    }
    if (section === "otp") {
      body.otp = {
        loginEnabled: otp.loginEnabled,
        autoSignupEnabled: otp.autoSignupEnabled,
      };
    }
    if (section === "otpTemplate") {
      body.otp = { template: otp.template };
    }
    const res = await fetch("/api/admin/settings", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    setSaving(null);
    const data = await res.json();
    if (!res.ok) {
      toast.push("error", data.error ?? "Save failed");
      return;
    }
    toast.push("success", "Settings saved");
    if (section === "google") setGoogleSecretInput("");
    if (section === "github") setGithubSecretInput("");
    if (section === "gmail") {
      setGmailSecretInput("");
      setGmailRefreshInput("");
    }
    refresh();
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Account expiry */}
      <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
        <h2 className="font-semibold mb-3">Account expiry</h2>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            saveSection("expiry");
          }}
          className="space-y-3 max-w-sm"
        >
          <label className="text-xs text-zinc-400 block">
            Default account validity after signup (days)
          </label>
          <input
            type="number"
            min={1}
            max={3650}
            value={loading ? "" : days}
            onChange={(e) => setDays(Number(e.target.value))}
            disabled={loading}
            required
          />
          <p className="text-xs text-zinc-500">
            Applies to new learner signups. Trainer accounts never expire once
            approved.
          </p>
          <button className="btn btn-primary" disabled={loading || saving === "expiry"}>
            {saving === "expiry" ? "Saving…" : "Save"}
          </button>
        </form>
      </section>

      {/* Google OAuth */}
      <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
        <h2 className="font-semibold mb-1">Google sign-in</h2>
        <p className="text-xs text-zinc-500 mb-3">
          Status:{" "}
          {google.configured ? (
            <span className="text-emerald-300">configured</span>
          ) : (
            <span className="text-amber-300">not configured</span>
          )}
          . Authorized redirect URI to set in Google Cloud Console:{" "}
          <code>https://www.tertiarytraining.com/api/auth/callback/google</code>
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            saveSection("google");
          }}
          className="space-y-3"
        >
          <div>
            <label className="text-xs text-zinc-400">Client ID</label>
            <input
              value={google.clientId}
              onChange={(e) => setGoogle({ ...google, clientId: e.target.value })}
              placeholder="xxxx.apps.googleusercontent.com"
            />
          </div>
          <div>
            <label className="text-xs text-zinc-400">
              Client secret {google.configured && "(currently set — leave blank to keep)"}
            </label>
            <input
              type="password"
              value={googleSecretInput}
              onChange={(e) => setGoogleSecretInput(e.target.value)}
              placeholder={google.clientSecretMasked ?? "GOCSPX-…"}
            />
            {google.clientSecretMasked && (
              <p className="text-xs text-zinc-600 mt-1">
                Current: <code>{google.clientSecretMasked}</code>
              </p>
            )}
          </div>
          <button className="btn btn-primary" disabled={saving === "google"}>
            {saving === "google" ? "Saving…" : "Save Google"}
          </button>
        </form>
      </section>

      {/* GitHub OAuth */}
      <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
        <h2 className="font-semibold mb-1">GitHub sign-in</h2>
        <p className="text-xs text-zinc-500 mb-3">
          Status:{" "}
          {github.configured ? (
            <span className="text-emerald-300">configured</span>
          ) : (
            <span className="text-amber-300">not configured</span>
          )}
          . Authorization callback URL to set in GitHub OAuth App:{" "}
          <code>https://www.tertiarytraining.com/api/auth/callback/github</code>
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            saveSection("github");
          }}
          className="space-y-3"
        >
          <div>
            <label className="text-xs text-zinc-400">Client ID</label>
            <input
              value={github.clientId}
              onChange={(e) => setGithub({ ...github, clientId: e.target.value })}
              placeholder="Iv1.xxxxxxxxxx"
            />
          </div>
          <div>
            <label className="text-xs text-zinc-400">
              Client secret {github.configured && "(currently set — leave blank to keep)"}
            </label>
            <input
              type="password"
              value={githubSecretInput}
              onChange={(e) => setGithubSecretInput(e.target.value)}
              placeholder={github.clientSecretMasked ?? "ghp_…"}
            />
            {github.clientSecretMasked && (
              <p className="text-xs text-zinc-600 mt-1">
                Current: <code>{github.clientSecretMasked}</code>
              </p>
            )}
          </div>
          <button className="btn btn-primary" disabled={saving === "github"}>
            {saving === "github" ? "Saving…" : "Save GitHub"}
          </button>
        </form>
      </section>

      {/* Gmail OAuth (for OTP delivery) */}
      <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
        <h2 className="font-semibold mb-1">Gmail (OTP delivery)</h2>
        <p className="text-xs text-zinc-500 mb-3">
          Status:{" "}
          {gmail.configured ? (
            <span className="text-emerald-300">configured</span>
          ) : (
            <span className="text-amber-300">not configured</span>
          )}
          . Used to send the one-time login codes via the Gmail API. Create an
          OAuth client in Google Cloud Console with the{" "}
          <code>https://www.googleapis.com/auth/gmail.send</code> scope, then
          generate a refresh token (e.g. via the OAuth Playground) for the{" "}
          <em>From</em> address.
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            saveSection("gmail");
          }}
          className="space-y-3"
        >
          <div>
            <label className="text-xs text-zinc-400">Client ID</label>
            <input
              value={gmail.clientId}
              onChange={(e) => setGmail({ ...gmail, clientId: e.target.value })}
              placeholder="xxxx.apps.googleusercontent.com"
            />
          </div>
          <div>
            <label className="text-xs text-zinc-400">
              Client secret {gmail.configured && "(currently set — leave blank to keep)"}
            </label>
            <input
              type="password"
              value={gmailSecretInput}
              onChange={(e) => setGmailSecretInput(e.target.value)}
              placeholder={gmail.clientSecretMasked ?? "GOCSPX-…"}
            />
            {gmail.clientSecretMasked && (
              <p className="text-xs text-zinc-600 mt-1">
                Current: <code>{gmail.clientSecretMasked}</code>
              </p>
            )}
          </div>
          <div>
            <label className="text-xs text-zinc-400">
              Refresh token {gmail.configured && "(currently set — leave blank to keep)"}
            </label>
            <input
              type="password"
              value={gmailRefreshInput}
              onChange={(e) => setGmailRefreshInput(e.target.value)}
              placeholder={gmail.refreshTokenMasked ?? "1//04…"}
            />
            {gmail.refreshTokenMasked && (
              <p className="text-xs text-zinc-600 mt-1">
                Current: <code>{gmail.refreshTokenMasked}</code>
              </p>
            )}
          </div>
          <div>
            <label className="text-xs text-zinc-400">From email</label>
            <input
              value={gmail.fromEmail}
              onChange={(e) => setGmail({ ...gmail, fromEmail: e.target.value })}
              placeholder="noreply@yourdomain.com"
            />
          </div>
          <div>
            <label className="text-xs text-zinc-400">From name</label>
            <input
              value={gmail.fromName}
              onChange={(e) => setGmail({ ...gmail, fromName: e.target.value })}
              placeholder="Tertiary Training"
            />
          </div>
          <button className="btn btn-primary" disabled={saving === "gmail"}>
            {saving === "gmail" ? "Saving…" : "Save Gmail"}
          </button>
        </form>
      </section>

      {/* OTP login config */}
      <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
        <h2 className="font-semibold mb-1">OTP login</h2>
        <p className="text-xs text-zinc-500 mb-3">
          Lets users sign in with a one-time code emailed to them, without a
          password. Requires the Gmail section above to be configured first.
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            saveSection("otp");
          }}
          className="space-y-3"
        >
          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              checked={otp.loginEnabled}
              onChange={(e) => setOtp({ ...otp, loginEnabled: e.target.checked })}
              className="mt-1"
            />
            <span>
              <span className="font-medium">Enable OTP login</span>
              <span className="block text-xs text-zinc-500">
                Shows the OTP tab on the login page. Turn off to hide it.
              </span>
            </span>
          </label>
          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              checked={otp.autoSignupEnabled}
              onChange={(e) => setOtp({ ...otp, autoSignupEnabled: e.target.checked })}
              className="mt-1"
            />
            <span>
              <span className="font-medium">Auto-create accounts on first OTP</span>
              <span className="block text-xs text-zinc-500">
                If a user verifies an OTP for an email that doesn&apos;t have an
                account, create a PENDING learner. Off by default — leaving it off
                means OTP only works for users who already signed up.
              </span>
            </span>
          </label>
          <button className="btn btn-primary" disabled={saving === "otp"}>
            {saving === "otp" ? "Saving…" : "Save OTP settings"}
          </button>
        </form>
      </section>

      {/* OTP email template */}
      <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
        <h2 className="font-semibold mb-1">OTP email template</h2>
        <p className="text-xs text-zinc-500 mb-3">
          Placeholders you can use:{" "}
          <code>{"{OTP}"}</code>, <code>{"{EXPIRY_MINUTES}"}</code>,{" "}
          <code>{"{USER_EMAIL}"}</code>, <code>{"{SITE_URL}"}</code>.
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            saveSection("otpTemplate");
          }}
          className="space-y-3"
        >
          <div>
            <label className="text-xs text-zinc-400">Subject</label>
            <input
              value={otp.template.subject}
              onChange={(e) =>
                setOtp({ ...otp, template: { ...otp.template, subject: e.target.value } })
              }
              placeholder="Your Tertiary Training login code"
            />
          </div>
          <div>
            <label className="text-xs text-zinc-400">Body</label>
            <textarea
              value={otp.template.body}
              onChange={(e) =>
                setOtp({ ...otp, template: { ...otp.template, body: e.target.value } })
              }
              rows={8}
              className="font-mono text-sm"
            />
          </div>
          <button className="btn btn-primary" disabled={saving === "otpTemplate"}>
            {saving === "otpTemplate" ? "Saving…" : "Save template"}
          </button>
        </form>
      </section>
    </div>
  );
}

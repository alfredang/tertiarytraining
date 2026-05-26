"use client";

import { useEffect, useState } from "react";
import { useToast } from "./Toast";

type OAuthState = {
  clientId: string;
  clientSecretMasked: string | null;
  configured: boolean;
};

export function SettingsForm() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  const [days, setDays] = useState<number>(7);

  const [google, setGoogle] = useState<OAuthState>({ clientId: "", clientSecretMasked: null, configured: false });
  const [googleSecretInput, setGoogleSecretInput] = useState("");

  const [github, setGithub] = useState<OAuthState>({ clientId: "", clientSecretMasked: null, configured: false });
  const [githubSecretInput, setGithubSecretInput] = useState("");

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((d) => {
        setDays(d.defaultValidityDays ?? 7);
        if (d.google) setGoogle(d.google);
        if (d.github) setGithub(d.github);
      })
      .finally(() => setLoading(false));
  }, []);

  async function saveSection(section: "expiry" | "google" | "github") {
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
    // Re-fetch to update masked secrets
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((d) => {
        if (d.google) setGoogle(d.google);
        if (d.github) setGithub(d.github);
      });
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
    </div>
  );
}

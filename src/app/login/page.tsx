"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useToast } from "@/components/Toast";
import { Footer } from "@/components/Footer";
import { Modal } from "@/components/Modal";

const OAUTH_ERROR_LABELS: Record<string, string> = {
  google_not_configured: "Google sign-in is not configured. Ask an admin.",
  github_not_configured: "GitHub sign-in is not configured. Ask an admin.",
  state_mismatch: "OAuth state mismatch. Please try again.",
  missing_state: "OAuth session expired. Please try again.",
  token_exchange_failed: "The provider rejected the authorization. Please try again.",
  userinfo_failed: "Could not read your profile from the provider. Please try again.",
  email_not_verified: "Your provider account has no verified email.",
  account_rejected: "Your account was rejected.",
  account_suspended: "Your account is suspended.",
  account_expired: "Your account has expired. Ask a trainer or admin to extend it.",
};

type Role = "LEARNER" | "TRAINER";

export default function LoginPage() {
  const router = useRouter();
  const toast = useToast();
  const [tab, setTab] = useState<"password" | "otp">("password");

  // Surface OAuth callback messages on first render (read from window
  // directly to avoid wrapping the whole page in a Suspense boundary
  // for useSearchParams).
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const err = params.get("oauth_error");
    if (err) {
      toast.push("error", OAUTH_ERROR_LABELS[err] ?? `Sign-in failed (${err})`);
    }
    if (params.get("oauth_pending")) {
      toast.push("info", "Account created — awaiting admin/trainer approval. You'll be able to sign in once approved.");
    }
    // We intentionally fire toasts only on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);

  // Signup modal state
  const [signupOpen, setSignupOpen] = useState(false);
  const [signupRole, setSignupRole] = useState<Role>("LEARNER");
  const [signupName, setSignupName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupLoading, setSignupLoading] = useState(false);
  const [signupDone, setSignupDone] = useState(false);

  async function submitPassword(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    setLoading(false);
    const data = await res.json();
    if (!res.ok) {
      toast.push("error", data.error ?? "Login failed");
      return;
    }
    toast.push("success", "Signed in");
    router.push(data.redirect ?? "/");
    router.refresh();
  }

  async function submitSignup(e: React.FormEvent) {
    e.preventDefault();
    setSignupLoading(true);
    const path = signupRole === "TRAINER" ? "/api/auth/signup/trainer" : "/api/auth/signup/learner";
    const res = await fetch(path, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: signupName, email: signupEmail, password: signupPassword }),
    });
    setSignupLoading(false);
    const data = await res.json();
    if (!res.ok) {
      toast.push("error", data.error ?? "Signup failed");
      return;
    }
    setSignupDone(true);
    toast.push("success", "Signup submitted — awaiting admin/trainer approval.");
  }

  function resetSignup() {
    setSignupDone(false);
    setSignupName("");
    setSignupEmail("");
    setSignupPassword("");
    setSignupRole("LEARNER");
  }

  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="flex items-center justify-center gap-2 mb-8">
            <div className="h-10 w-10 rounded-xl bg-indigo-500 grid place-items-center font-bold">T</div>
            <div className="text-xl font-semibold">Tertiary Training</div>
          </div>
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 md:p-8 shadow-xl">
            <h1 className="text-2xl font-semibold mb-1">Welcome back</h1>
            <p className="text-sm text-zinc-400 mb-6">
              Sign in to access your training environments.
            </p>

            <div className="flex gap-1 rounded-lg bg-zinc-800/60 p-1 mb-6 text-sm">
              <button
                className={`flex-1 rounded-md py-1.5 ${tab === "password" ? "bg-zinc-900 text-zinc-100" : "text-zinc-400"}`}
                onClick={() => setTab("password")}
              >
                Email + Password
              </button>
              <button
                className={`flex-1 rounded-md py-1.5 ${tab === "otp" ? "bg-zinc-900 text-zinc-100" : "text-zinc-400"}`}
                onClick={() => setTab("otp")}
              >
                OTP
              </button>
            </div>

            {tab === "password" ? (
              <form onSubmit={submitPassword} className="space-y-4">
                <div>
                  <label className="text-xs text-zinc-400">Email</label>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
                </div>
                <div>
                  <label className="text-xs text-zinc-400">Password</label>
                  <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
                </div>
                <button className="btn btn-primary w-full" disabled={loading}>
                  {loading ? "Signing in…" : "Sign in"}
                </button>
              </form>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="text-xs text-zinc-400">Email</label>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <button
                  type="button"
                  className="btn btn-ghost w-full"
                  onClick={() => toast.push("info", "OTP delivery is not configured in this build.")}
                >
                  Send OTP
                </button>
                <div>
                  <label className="text-xs text-zinc-400">One-time code</label>
                  <input value={otp} onChange={(e) => setOtp(e.target.value)} placeholder="123456" />
                </div>
                <button
                  type="button"
                  className="btn btn-primary w-full"
                  onClick={() => toast.push("info", "OTP login is a stub — configure an email/SMS provider to enable.")}
                >
                  Verify
                </button>
              </div>
            )}

            <div className="my-6 flex items-center gap-3 text-xs text-zinc-500">
              <div className="h-px flex-1 bg-zinc-800" /> OR <div className="h-px flex-1 bg-zinc-800" />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <a className="btn btn-ghost text-center" href="/api/auth/oauth/google">
                Continue with Google
              </a>
              <a className="btn btn-ghost text-center" href="/api/auth/oauth/github">
                Continue with GitHub
              </a>
            </div>

            <div className="mt-6 text-center text-sm text-zinc-400">
              Don&apos;t have an account?{" "}
              <button
                type="button"
                onClick={() => { resetSignup(); setSignupOpen(true); }}
                className="text-indigo-400 hover:underline"
              >
                Sign up
              </button>
            </div>
          </div>
        </div>
      </div>
      <Footer />

      <Modal
        open={signupOpen}
        onClose={() => setSignupOpen(false)}
        title={signupDone ? "Almost there" : "Create an account"}
      >
        {signupDone ? (
          <div className="space-y-4">
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-200">
              Thanks — your account has been submitted and is{" "}
              <strong>pending approval</strong>. A trainer or admin will review
              it shortly. You&apos;ll be able to sign in once approved.
            </div>
            <p className="text-xs text-zinc-500">
              By default, learner accounts are valid for a limited time after
              signup (configurable by the admin). Trainers can extend your
              expiry whenever needed.
            </p>
            <div className="flex justify-end">
              <button className="btn btn-primary" onClick={() => setSignupOpen(false)}>
                Close
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={submitSignup} className="space-y-4">
            <div>
              <label className="text-xs text-zinc-400">I&apos;m signing up as</label>
              <div className="flex gap-1 rounded-lg bg-zinc-800/60 p-1 text-sm mt-1">
                <button
                  type="button"
                  className={`flex-1 rounded-md py-1.5 ${signupRole === "LEARNER" ? "bg-zinc-900 text-zinc-100" : "text-zinc-400"}`}
                  onClick={() => setSignupRole("LEARNER")}
                >
                  Learner
                </button>
                <button
                  type="button"
                  className={`flex-1 rounded-md py-1.5 ${signupRole === "TRAINER" ? "bg-zinc-900 text-zinc-100" : "text-zinc-400"}`}
                  onClick={() => setSignupRole("TRAINER")}
                >
                  Trainer
                </button>
              </div>
            </div>
            <div>
              <label className="text-xs text-zinc-400">Full name</label>
              <input
                value={signupName}
                onChange={(e) => setSignupName(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="text-xs text-zinc-400">Email</label>
              <input
                type="email"
                value={signupEmail}
                onChange={(e) => setSignupEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="text-xs text-zinc-400">Password</label>
              <input
                type="password"
                minLength={8}
                value={signupPassword}
                onChange={(e) => setSignupPassword(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <a className="btn btn-ghost text-center" href="/api/auth/oauth/google">
                Sign up with Google
              </a>
              <a className="btn btn-ghost text-center" href="/api/auth/oauth/github">
                Sign up with GitHub
              </a>
            </div>

            <p className="text-xs text-zinc-500">
              New accounts are <strong>pending approval</strong>. Learner
              accounts have a default expiry (set by the admin) and can be
              extended by a trainer or admin. Trainer accounts never expire
              once approved.
            </p>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setSignupOpen(false)}
              >
                Cancel
              </button>
              <button className="btn btn-primary" disabled={signupLoading}>
                {signupLoading ? "Submitting…" : "Create account"}
              </button>
            </div>

            <div className="text-center text-xs text-zinc-500 pt-2">
              <Link href="/login" className="hover:text-zinc-300">
                Already have an account? Sign in instead.
              </Link>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}

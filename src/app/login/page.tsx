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

const OTP_ERROR_LABELS: Record<string, string> = {
  otp_disabled: "One-time code sign-in isn't enabled. Ask an admin.",
  invalid_email: "That doesn't look like a valid email.",
  invalid_input: "Please enter your email and the 6-digit code.",
  invalid_code: "That code is wrong or has already been used.",
  expired: "That code has expired. Request a new one.",
  too_many_attempts: "Too many wrong attempts. Request a new code.",
  rate_limited: "Too many requests. Try again in a minute.",
  account_not_found: "No account found for that email.",
  account_rejected: "Your account was rejected.",
  account_suspended: "Your account is suspended.",
  account_expired: "Your account has expired. Ask a trainer or admin to extend it.",
  server_error: "Something went wrong. Try again.",
  delivery_failed: "We couldn't send the code right now. Try again shortly.",
};

type Role = "LEARNER" | "TRAINER";

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
      <path fill="#EA4335" d="M12 5c1.6 0 3 .55 4.1 1.5l3-3A11 11 0 0 0 2.3 7l3.6 2.8C6.8 7.05 9.2 5 12 5z" />
      <path fill="#4285F4" d="M23 12c0-.8-.08-1.6-.2-2.4H12v4.55h6.2c-.27 1.4-1.1 2.65-2.45 3.5l3.55 2.75A11 11 0 0 0 23 12z" />
      <path fill="#FBBC05" d="M5.9 14.2A6.6 6.6 0 0 1 5.5 12c0-.78.14-1.5.38-2.2L2.3 7A11 11 0 0 0 1 12c0 1.78.43 3.46 1.3 5l3.6-2.8z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.3-2.65l-3.55-2.75c-1 .68-2.26 1.07-3.75 1.07-2.8 0-5.2-2.05-6.1-4.47L2.3 17A11 11 0 0 0 12 23z" />
    </svg>
  );
}

function GitHubIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden="true">
      <path d="M12 .3a12 12 0 0 0-3.8 23.4c.6.1.8-.3.8-.6v-2.2C5.7 21.5 5 19.8 5 19.8c-.5-1.3-1.3-1.7-1.3-1.7-1-.7.1-.7.1-.7 1.2 0 1.8 1.2 1.8 1.2 1 1.8 2.8 1.3 3.5 1 .1-.8.4-1.3.7-1.6-2.6-.3-5.4-1.3-5.4-5.9 0-1.3.5-2.4 1.2-3.2-.1-.3-.5-1.5.1-3.2 0 0 1-.3 3.3 1.2a11.5 11.5 0 0 1 6 0c2.3-1.5 3.3-1.2 3.3-1.2.7 1.7.3 2.9.1 3.2.8.8 1.2 1.9 1.2 3.2 0 4.6-2.8 5.6-5.5 5.9.5.4.8 1.1.8 2.2v3.3c0 .3.2.7.8.6A12 12 0 0 0 12 .3" />
    </svg>
  );
}

function EyeIcon({ open }: { open: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {open ? (
        <>
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
          <circle cx="12" cy="12" r="3" />
        </>
      ) : (
        <>
          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
          <line x1="1" y1="1" x2="23" y2="23" />
        </>
      )}
    </svg>
  );
}

function Divider({ label }: { label?: string }) {
  if (!label) return <div className="h-px bg-zinc-800/80" />;
  return (
    <div className="flex items-center gap-3">
      <div className="h-px flex-1 bg-zinc-800/80" />
      <span className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">{label}</span>
      <div className="h-px flex-1 bg-zinc-800/80" />
    </div>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const toast = useToast();
  const [tab, setTab] = useState<"password" | "otp">("password");
  const [showPassword, setShowPassword] = useState(false);

  // Surface OAuth callback messages on first render.
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [otpSending, setOtpSending] = useState(false);
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [otpSent, setOtpSent] = useState(false);

  // Signup modal state
  const [signupOpen, setSignupOpen] = useState(false);
  const [signupRole, setSignupRole] = useState<Role>("LEARNER");
  const [signupName, setSignupName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupShowPassword, setSignupShowPassword] = useState(false);
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

  async function sendOtp() {
    if (!email) {
      toast.push("error", "Enter your email first.");
      return;
    }
    setOtpSending(true);
    const res = await fetch("/api/auth/otp/send", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email }),
    });
    setOtpSending(false);
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) {
      toast.push("error", OTP_ERROR_LABELS[data.error] ?? "Could not send code.");
      return;
    }
    setOtpSent(true);
    toast.push("success", `Code sent to ${email}.`);
  }

  async function verifyOtp() {
    if (!email || !otp) {
      toast.push("error", "Enter your email and the 6-digit code.");
      return;
    }
    setOtpVerifying(true);
    const res = await fetch("/api/auth/otp/verify", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, code: otp }),
    });
    setOtpVerifying(false);
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) {
      toast.push("error", OTP_ERROR_LABELS[data.error] ?? "Verification failed.");
      return;
    }
    if (data.pending) {
      toast.push(
        "info",
        "Account created — awaiting admin/trainer approval. You'll be able to sign in once approved.",
      );
      setOtpSent(false);
      setOtp("");
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
    toast.push("success", "Signup submitted — awaiting approval.");
  }

  function resetSignup() {
    setSignupDone(false);
    setSignupName("");
    setSignupEmail("");
    setSignupPassword("");
    setSignupShowPassword(false);
    setSignupRole("LEARNER");
  }

  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-[400px]">
          {/* Brand */}
          <div className="flex items-center justify-center gap-2.5 mb-10">
            <div className="h-8 w-8 rounded-lg bg-indigo-500 grid place-items-center text-sm font-semibold text-white">
              T
            </div>
            <div className="text-[15px] font-semibold tracking-tight text-zinc-100">
              Tertiary Training
            </div>
          </div>

          {/* Card */}
          <div className="rounded-2xl border border-zinc-800/60 bg-zinc-900 p-8 md:p-10">
            <h1 className="text-[22px] font-semibold tracking-tight mb-1.5">Welcome back</h1>
            <p className="text-sm text-zinc-400 mb-8">
              Sign in to access your training environments.
            </p>

            {/* Tabs */}
            <div className="flex border-b border-zinc-800 mb-7 text-[13px]">
              <button
                className={`flex-1 pb-3 -mb-px border-b-2 transition-colors ${
                  tab === "password"
                    ? "border-indigo-500 text-zinc-100 font-medium"
                    : "border-transparent text-zinc-400 hover:text-zinc-200"
                }`}
                onClick={() => setTab("password")}
              >
                Email & password
              </button>
              <button
                className={`flex-1 pb-3 -mb-px border-b-2 transition-colors ${
                  tab === "otp"
                    ? "border-indigo-500 text-zinc-100 font-medium"
                    : "border-transparent text-zinc-400 hover:text-zinc-200"
                }`}
                onClick={() => setTab("otp")}
              >
                One-time code
              </button>
            </div>

            {tab === "password" ? (
              <form onSubmit={submitPassword} className="space-y-5">
                <div>
                  <label className="text-xs font-medium text-zinc-400 mb-1.5 block">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@company.com"
                    required
                    autoComplete="email"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-zinc-400 mb-1.5 block">Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      autoComplete="current-password"
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((s) => !s)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors p-1"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      tabIndex={-1}
                    >
                      <EyeIcon open={showPassword} />
                    </button>
                  </div>
                </div>
                <button className="btn btn-primary w-full" disabled={loading}>
                  {loading ? "Signing in…" : "Sign in"}
                </button>
              </form>
            ) : !otpSent ? (
              <div className="space-y-5">
                <div>
                  <label className="text-xs font-medium text-zinc-400 mb-1.5 block">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@company.com"
                    autoComplete="email"
                  />
                </div>
                <button
                  type="button"
                  className="btn btn-primary w-full"
                  onClick={sendOtp}
                  disabled={otpSending}
                >
                  {otpSending ? "Sending…" : "Send code"}
                </button>
                <p className="text-[11px] text-zinc-500 text-center leading-relaxed">
                  We&apos;ll email you a 6-digit code. No password needed.
                </p>
              </div>
            ) : (
              <div className="space-y-5">
                <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/[0.07] px-3 py-2.5 text-[12px] text-emerald-300">
                  Code sent to <span className="font-medium">{email}</span> — valid for 5 minutes.
                </div>
                <div>
                  <label className="text-xs font-medium text-zinc-400 mb-1.5 block">Enter the 6-digit code</label>
                  <input
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="000000"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    autoFocus
                    className="tracking-[0.5em] text-center text-lg font-medium"
                  />
                </div>
                <button
                  type="button"
                  className="btn btn-primary w-full"
                  onClick={verifyOtp}
                  disabled={otpVerifying}
                >
                  {otpVerifying ? "Verifying…" : "Verify and sign in"}
                </button>
                <div className="flex items-center justify-between text-[12px]">
                  <button
                    type="button"
                    onClick={() => {
                      setOtpSent(false);
                      setOtp("");
                    }}
                    className="text-zinc-400 hover:text-zinc-200 transition-colors"
                  >
                    ← Use a different email
                  </button>
                  <button
                    type="button"
                    onClick={sendOtp}
                    disabled={otpSending}
                    className="text-indigo-400 hover:text-indigo-300 transition-colors disabled:opacity-50"
                  >
                    {otpSending ? "Sending…" : "Resend code"}
                  </button>
                </div>
              </div>
            )}

            <div className="my-7">
              <Divider label="or continue with" />
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <a className="btn btn-ghost text-center" href="/api/auth/oauth/google">
                <GoogleIcon /> Google
              </a>
              <a className="btn btn-ghost text-center" href="/api/auth/oauth/github">
                <GitHubIcon /> GitHub
              </a>
            </div>
          </div>

          {/* Footer link */}
          <div className="mt-6 text-center text-[13px] text-zinc-400">
            Don&apos;t have an account?{" "}
            <button
              type="button"
              onClick={() => { resetSignup(); setSignupOpen(true); }}
              className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
            >
              Sign up
            </button>
          </div>
        </div>
      </div>
      <Footer />

      <Modal
        open={signupOpen}
        onClose={() => setSignupOpen(false)}
        title={signupDone ? "Almost there" : "Create your account"}
      >
        {signupDone ? (
          <div className="space-y-4">
            <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/[0.07] p-4 text-sm text-emerald-200">
              Your account has been submitted and is{" "}
              <strong>pending approval</strong>. A trainer or admin will review it shortly — you&apos;ll be able to sign in once it&apos;s approved.
            </div>
            <p className="text-xs text-zinc-500 leading-relaxed">
              Learner accounts have a default validity period after signup (configurable by the admin). Trainers or admins can extend your account whenever needed.
            </p>
            <div className="flex justify-end">
              <button className="btn btn-primary" onClick={() => setSignupOpen(false)}>
                Got it
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={submitSignup} className="space-y-5">
            <div>
              <label className="text-xs font-medium text-zinc-400 mb-1.5 block">I&apos;m signing up as a</label>
              <div className="flex gap-1 rounded-lg bg-zinc-800/60 p-1 text-[13px]">
                <button
                  type="button"
                  className={`flex-1 rounded-md py-1.5 transition-colors ${
                    signupRole === "LEARNER"
                      ? "bg-indigo-500 text-white"
                      : "text-zinc-400 hover:text-zinc-200"
                  }`}
                  onClick={() => setSignupRole("LEARNER")}
                >
                  Learner
                </button>
                <button
                  type="button"
                  className={`flex-1 rounded-md py-1.5 transition-colors ${
                    signupRole === "TRAINER"
                      ? "bg-indigo-500 text-white"
                      : "text-zinc-400 hover:text-zinc-200"
                  }`}
                  onClick={() => setSignupRole("TRAINER")}
                >
                  Trainer
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <a className="btn btn-ghost text-center" href="/api/auth/oauth/google">
                <GoogleIcon /> Google
              </a>
              <a className="btn btn-ghost text-center" href="/api/auth/oauth/github">
                <GitHubIcon /> GitHub
              </a>
            </div>

            <Divider label="or with email" />

            <div>
              <label className="text-xs font-medium text-zinc-400 mb-1.5 block">Full name</label>
              <input
                value={signupName}
                onChange={(e) => setSignupName(e.target.value)}
                placeholder="Your full name"
                required
              />
            </div>
            <div>
              <label className="text-xs font-medium text-zinc-400 mb-1.5 block">Email</label>
              <input
                type="email"
                value={signupEmail}
                onChange={(e) => setSignupEmail(e.target.value)}
                placeholder="name@company.com"
                required
              />
            </div>
            <div>
              <label className="text-xs font-medium text-zinc-400 mb-1.5 block">Password</label>
              <div className="relative">
                <input
                  type={signupShowPassword ? "text" : "password"}
                  minLength={8}
                  value={signupPassword}
                  onChange={(e) => setSignupPassword(e.target.value)}
                  required
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setSignupShowPassword((s) => !s)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors p-1"
                  aria-label={signupShowPassword ? "Hide password" : "Show password"}
                  tabIndex={-1}
                >
                  <EyeIcon open={signupShowPassword} />
                </button>
              </div>
            </div>

            <p className="text-[11px] text-zinc-500 leading-relaxed">
              New accounts are <strong>pending approval</strong>. Learners get a default expiry set by the admin; a trainer or admin can extend it. Trainer accounts never expire once approved.
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

            <div className="text-center text-[11px] text-zinc-500 pt-1">
              <Link href="/login" className="hover:text-zinc-300 transition-colors">
                Already have an account? Sign in instead.
              </Link>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useToast } from "@/components/Toast";
import { Footer } from "@/components/Footer";

export default function LoginPage() {
  const router = useRouter();
  const toast = useToast();
  const [tab, setTab] = useState<"password" | "otp">("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);

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
            <p className="text-sm text-zinc-400 mb-6">Sign in to access your training environments.</p>

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
              <button
                className="btn btn-ghost"
                onClick={() => toast.push("info", "Configure OAuth provider to enable Google sign-in.")}
              >
                Google
              </button>
              <button
                className="btn btn-ghost"
                onClick={() => toast.push("info", "Configure OAuth provider to enable GitHub sign-in.")}
              >
                GitHub
              </button>
            </div>

            <div className="mt-6 text-center text-sm text-zinc-400 space-x-3">
              <Link className="text-indigo-400 hover:underline" href="/signup/learner">Learner signup</Link>
              <span>·</span>
              <Link className="text-indigo-400 hover:underline" href="/signup/trainer">Trainer signup</Link>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}

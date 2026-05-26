"use client";

import Link from "next/link";
import { useState } from "react";
import { useToast } from "./Toast";
import { Footer } from "./Footer";

export function SignupForm({ role }: { role: "learner" | "trainer" }) {
  const toast = useToast();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await fetch(`/api/auth/signup/${role}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });
    setLoading(false);
    const data = await res.json();
    if (!res.ok) {
      toast.push("error", data.error ?? "Signup failed");
      return;
    }
    setDone(true);
    toast.push("success", "Signup submitted — awaiting admin approval.");
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
            <h1 className="text-2xl font-semibold mb-1">
              {role === "learner" ? "Learner signup" : "Trainer signup"}
            </h1>
            <p className="text-sm text-zinc-400 mb-6">
              New accounts are reviewed by an administrator before activation.
            </p>

            {done ? (
              <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-200">
                Thanks — your account is pending admin approval. You&apos;ll be able to sign in once approved.
              </div>
            ) : (
              <form onSubmit={submit} className="space-y-4">
                <div>
                  <label className="text-xs text-zinc-400">Full name</label>
                  <input value={name} onChange={(e) => setName(e.target.value)} required />
                </div>
                <div>
                  <label className="text-xs text-zinc-400">Email</label>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>
                <div>
                  <label className="text-xs text-zinc-400">Password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    minLength={8}
                    required
                  />
                </div>
                <button className="btn btn-primary w-full" disabled={loading}>
                  {loading ? "Submitting…" : "Create account"}
                </button>
              </form>
            )}

            <div className="mt-6 text-center text-sm text-zinc-400">
              <Link className="text-indigo-400 hover:underline" href="/login">Back to login</Link>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}

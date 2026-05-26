"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useState } from "react";
import { cn } from "@/lib/utils";

export type NavItem = { href: string; label: string; icon?: string };

export function DashboardShell({
  user,
  nav,
  children,
}: {
  user: { name: string; email: string; role: string };
  nav: NavItem[];
  children: ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen bg-zinc-950 text-zinc-100">
      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-30 w-64 transform border-r border-zinc-800 bg-zinc-900 transition-transform md:static md:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-16 items-center gap-2 border-b border-zinc-800 px-5">
          <div className="h-8 w-8 rounded-lg bg-indigo-500 grid place-items-center text-sm font-bold">T</div>
          <div className="font-semibold">Tertiary Training</div>
        </div>
        <nav className="p-3 space-y-1 text-sm">
          {nav.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-3 py-2 transition-colors",
                  active
                    ? "bg-indigo-500/15 text-indigo-200"
                    : "text-zinc-300 hover:bg-zinc-800/70 hover:text-zinc-50",
                )}
              >
                <span className="text-zinc-400">{item.icon ?? "•"}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main */}
      <div className="flex flex-1 flex-col min-w-0">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-zinc-800 bg-zinc-950/80 px-4 backdrop-blur md:px-6">
          <button
            className="md:hidden btn btn-ghost px-2 py-1"
            onClick={() => setOpen((v) => !v)}
            aria-label="Toggle navigation"
          >
            ☰
          </button>
          <div className="hidden md:block text-sm text-zinc-400">
            {pathname}
          </div>
          <div className="flex items-center gap-3">
            {user.role === "ADMIN" && (
              <select
                aria-label="View as"
                className="max-w-[160px] py-1.5"
                value={
                  pathname.startsWith("/dashboard/learner") ? "/dashboard/learner" :
                  pathname.startsWith("/dashboard/trainer") ? "/dashboard/trainer" :
                  "/dashboard/admin"
                }
                onChange={(e) => router.push(e.target.value)}
              >
                <option value="/dashboard/admin">View as: Admin</option>
                <option value="/dashboard/trainer">View as: Trainer</option>
                <option value="/dashboard/learner">View as: Learner</option>
              </select>
            )}
            <div className="text-right text-xs">
              <div className="font-medium text-zinc-100">{user.name}</div>
              <div className="text-zinc-500">{user.email} · {user.role}</div>
            </div>
            <button className="btn btn-ghost" onClick={logout}>Logout</button>
          </div>
        </header>
        <main className="flex-1 p-4 md:p-6">{children}</main>
        <footer className="border-t border-zinc-800 py-4 text-center text-xs text-zinc-500">
          Powered by{" "}
          <a
            href="https://www.tertiarycourses.com.sg"
            target="_blank"
            rel="noreferrer noopener"
            className="text-indigo-400 hover:underline"
          >
            Tertiary Infotech Academy Pte Ltd
          </a>
        </footer>
      </div>

      {open && (
        <div
          className="fixed inset-0 z-20 bg-black/60 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}
    </div>
  );
}

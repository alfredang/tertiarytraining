"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export type NavItem = { href: string; label: string; icon?: string };

function ViewAsSwitcher({ pathname }: { pathname: string }) {
  const current =
    pathname.startsWith("/dashboard/learner") ? "LEARNER" :
    pathname.startsWith("/dashboard/trainer") ? "TRAINER" :
    "ADMIN";

  const targets = [
    { role: "ADMIN" as const,   href: "/dashboard/admin",   label: "Admin" },
    { role: "TRAINER" as const, href: "/dashboard/trainer", label: "Trainer" },
    { role: "LEARNER" as const, href: "/dashboard/learner", label: "Learner" },
  ];

  function switchTo(role: "ADMIN" | "TRAINER" | "LEARNER", href: string) {
    // Set the cookie and do a full reload to the destination. This avoids
    // Next.js's client router cache serving a stale prefetched version of
    // pages (e.g. /how-to) that was prefetched before the cookie existed.
    document.cookie = `tt_viewas=${role}; path=/; max-age=${60 * 60 * 24 * 7}; samesite=lax`;
    window.location.href = href;
  }

  return (
    <div className="hidden sm:flex items-center gap-1 rounded-lg bg-zinc-800/60 p-1 text-xs">
      <span className="px-2 text-zinc-500 hidden md:inline">View as:</span>
      {targets.map((t) => (
        <button
          key={t.role}
          type="button"
          onClick={() => switchTo(t.role, t.href)}
          className={cn(
            "px-3 py-1 rounded-md transition-colors",
            current === t.role
              ? "bg-zinc-900 text-zinc-100"
              : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800",
          )}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

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
  const [collapsed, setCollapsed] = useState(false);

  // Hydrate collapsed preference from localStorage on first client render.
  useEffect(() => {
    const stored = typeof window !== "undefined" ? localStorage.getItem("tt_sidebar_collapsed") : null;
    if (stored === "1") setCollapsed(true);
  }, []);

  function toggleCollapsed() {
    setCollapsed((v) => {
      const next = !v;
      try { localStorage.setItem("tt_sidebar_collapsed", next ? "1" : "0"); } catch {}
      return next;
    });
  }

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
          "fixed inset-y-0 left-0 z-30 transform border-r border-zinc-800 bg-zinc-900 transition-[transform,width] md:static md:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
          // Mobile drawer stays at full width; only collapse on md+
          collapsed ? "w-64 md:w-16" : "w-64",
        )}
      >
        <div
          className={cn(
            "flex h-16 items-center gap-2 border-b border-zinc-800",
            collapsed ? "md:justify-center md:px-2 px-5" : "px-5",
          )}
        >
          <div className="h-8 w-8 rounded-lg bg-indigo-500 grid place-items-center text-sm font-bold shrink-0">T</div>
          <div className={cn("font-semibold whitespace-nowrap", collapsed && "md:hidden")}>
            Tertiary Training
          </div>
        </div>
        <nav className="p-3 space-y-1 text-sm">
          {nav.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                title={collapsed ? item.label : undefined}
                className={cn(
                  "flex items-center rounded-lg transition-colors",
                  collapsed ? "md:justify-center md:px-2 md:py-2 gap-2 px-3 py-2" : "gap-2 px-3 py-2",
                  active
                    ? "bg-indigo-500/15 text-indigo-200"
                    : "text-zinc-300 hover:bg-zinc-800/70 hover:text-zinc-50",
                )}
              >
                <span className="text-zinc-400 shrink-0">{item.icon ?? "•"}</span>
                <span className={cn("truncate", collapsed && "md:hidden")}>{item.label}</span>
              </Link>
            );
          })}
        </nav>
        {/* Desktop-only collapse/expand toggle, pinned to the bottom */}
        <button
          type="button"
          onClick={toggleCollapsed}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="hidden md:flex absolute bottom-3 left-0 right-0 mx-3 items-center justify-center gap-1 rounded-lg border border-zinc-800 bg-zinc-900 px-2 py-1.5 text-xs text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
        >
          <span className="text-base leading-none">{collapsed ? "›" : "‹"}</span>
          <span className={cn(collapsed && "md:hidden")}>Collapse</span>
        </button>
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
              <ViewAsSwitcher pathname={pathname} />
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

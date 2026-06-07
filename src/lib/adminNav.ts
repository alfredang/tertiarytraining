import type { NavItem } from "@/components/DashboardShell";

export const adminNav: NavItem[] = [
  { href: "/dashboard/admin", label: "Overview", icon: "◉" },
  { href: "/admin/users", label: "Users", icon: "👥" },
  { href: "/admin/signup-approvals", label: "Signup Approvals", icon: "✓" },
  { href: "/admin/environments", label: "Environments", icon: "▣" },
  { href: "/admin/containers", label: "Containers", icon: "⬢" },
  { href: "/admin/refresh-logs", label: "Refresh Logs", icon: "↻" },
  { href: "/how-to/workflow", label: "Workflow", icon: "→" },
  { href: "/how-to/container-lifecycle", label: "Container Lifecycle", icon: "♻" },
  { href: "/how-to", label: "How To", icon: "?" },
  { href: "/admin/settings", label: "Settings", icon: "⚙" },
];

// Trainer nav: trainer dashboard + the two admin pages they're allowed into.
export const trainerNav: NavItem[] = [
  { href: "/dashboard/trainer", label: "My Environments", icon: "▣" },
  { href: "/admin/signup-approvals", label: "Signup Approvals", icon: "✓" },
  { href: "/admin/users", label: "Learners", icon: "👥" },
  { href: "/playgrounds", label: "Playground", icon: "🧪" },
  { href: "/how-to/workflow", label: "Workflow", icon: "→" },
  { href: "/how-to/container-lifecycle", label: "Container Lifecycle", icon: "♻" },
  { href: "/how-to", label: "How To", icon: "?" },
];

export const learnerNav: NavItem[] = [
  { href: "/dashboard/learner", label: "My Environments", icon: "▣" },
  { href: "/playgrounds", label: "Playground", icon: "🧪" },
  { href: "/how-to", label: "How To", icon: "?" },
];

export function navForRole(role: "ADMIN" | "TRAINER" | "LEARNER"): NavItem[] {
  if (role === "ADMIN") return adminNav;
  if (role === "TRAINER") return trainerNav;
  return learnerNav;
}

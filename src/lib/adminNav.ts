import type { NavItem } from "@/components/DashboardShell";

export const adminNav: NavItem[] = [
  { href: "/dashboard/admin", label: "Overview", icon: "◉" },
  { href: "/admin/users", label: "Users", icon: "👥" },
  { href: "/admin/signup-approvals", label: "Signup Approvals", icon: "✓" },
  { href: "/admin/environments", label: "Environments", icon: "▣" },
  { href: "/admin/containers", label: "Containers", icon: "⬢" },
  { href: "/admin/refresh-logs", label: "Refresh Logs", icon: "↻" },
  { href: "/admin/how-to", label: "How To", icon: "?" },
  { href: "/admin/settings", label: "Settings", icon: "⚙" },
];

export function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

export function formatDate(d: Date | string | null | undefined) {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleString();
}

export function statusBadgeClass(s: string) {
  switch (s) {
    case "ACTIVE":
    case "RUNNING":
      return "bg-emerald-500/15 text-emerald-300 border-emerald-500/30";
    case "PENDING":
    case "REFRESHING":
      return "bg-amber-500/15 text-amber-300 border-amber-500/30";
    case "SUSPENDED":
    case "STOPPED":
      return "bg-zinc-500/15 text-zinc-300 border-zinc-500/30";
    case "REJECTED":
    case "ERROR":
      return "bg-rose-500/15 text-rose-300 border-rose-500/30";
    default:
      return "bg-zinc-500/15 text-zinc-300 border-zinc-500/30";
  }
}

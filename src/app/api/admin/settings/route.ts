import { NextResponse } from "next/server";
import { requireRole, getSessionUser } from "@/lib/auth";
import { getDefaultValidityDays, setDefaultValidityDays } from "@/lib/settings";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  // Trainers also need to know the current default when adjusting users.
  const defaultValidityDays = await getDefaultValidityDays();
  return NextResponse.json({ defaultValidityDays });
}

export async function POST(req: Request) {
  const { user, error, status } = await requireRole("ADMIN");
  if (!user) return NextResponse.json({ error }, { status });
  const body = await req.json().catch(() => ({}));
  const days = Number(body.defaultValidityDays);
  if (!Number.isFinite(days) || days <= 0 || days > 3650)
    return NextResponse.json({ error: "defaultValidityDays must be a positive number" }, { status: 400 });
  await setDefaultValidityDays(days);
  return NextResponse.json({ ok: true, defaultValidityDays: Math.floor(days) });
}

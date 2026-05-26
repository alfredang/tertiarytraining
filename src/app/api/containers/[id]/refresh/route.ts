import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { refreshOneContainer } from "@/lib/refresh";

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  // Learners are forbidden; admin and trainer may refresh
  const { user, error, status } = await requireRole("ADMIN", "TRAINER");
  if (!user) return NextResponse.json({ error }, { status });
  const { id } = await ctx.params;
  const result = await refreshOneContainer(id, user.id);
  if (!result.ok) return NextResponse.json({ error: result.message }, { status: 500 });
  return NextResponse.json({ ok: true, containerUrl: result.containerUrl });
}

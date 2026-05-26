import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, getSessionUser } from "@/lib/auth";
import { environmentSchema } from "@/lib/validation";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const environments = await prisma.environment.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json({ environments });
}

export async function POST(req: Request) {
  const { user, error, status } = await requireRole("ADMIN");
  if (!user) return NextResponse.json({ error }, { status });
  const parsed = environmentSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  try {
    const env = await prisma.environment.create({ data: parsed.data });
    return NextResponse.json({ environment: env });
  } catch {
    return NextResponse.json({ error: "Could not create (name must be unique)" }, { status: 409 });
  }
}

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser, requireRole } from "@/lib/auth";
import { containerSchema } from "@/lib/validation";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  // Admins see all; others see only their assigned containers
  const where = user.role === "ADMIN" ? {} : { assignedUserId: user.id };
  const containers = await prisma.dockerContainer.findMany({
    where,
    include: {
      environment: { select: { name: true } },
      assignedUser: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ containers });
}

export async function POST(req: Request) {
  const { user, error, status } = await requireRole("ADMIN");
  if (!user) return NextResponse.json({ error }, { status });
  const parsed = containerSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  try {
    const c = await prisma.dockerContainer.create({
      data: {
        name: parsed.data.name,
        environmentId: parsed.data.environmentId,
        containerUrl: parsed.data.containerUrl,
        port: parsed.data.port,
        assignedUserId: parsed.data.assignedUserId ?? null,
        status: parsed.data.status ?? "STOPPED",
      },
    });
    return NextResponse.json({ container: c });
  } catch {
    return NextResponse.json({ error: "Could not create container (name must be unique)" }, { status: 409 });
  }
}

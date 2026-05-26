import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { dockerService, hostContainerNamesFor } from "@/lib/docker";

/**
 * Auto-stop containers idle for more than IDLE_HOURS.
 *
 * Designed to be invoked by a systemd timer on the host (or external
 * cron). Gated by the SEED_TOKEN to keep it from being a DoS vector.
 *
 *   curl -X POST \
 *     -H "x-seed-token: $SEED_TOKEN" \
 *     https://www.tertiarytraining.com/api/admin/cleanup-idle
 */
const IDLE_HOURS = Number(process.env.IDLE_AUTOSTOP_HOURS ?? "2");

export async function POST(req: Request) {
  const expected = process.env.SEED_TOKEN;
  if (!expected) return NextResponse.json({ error: "SEED_TOKEN not set" }, { status: 500 });
  if (req.headers.get("x-seed-token") !== expected)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const cutoff = new Date(Date.now() - IDLE_HOURS * 60 * 60 * 1000);

  const idle = await prisma.dockerContainer.findMany({
    where: {
      status: "RUNNING",
      OR: [
        { lastAccessedAt: null }, // running but never touched via app
        { lastAccessedAt: { lt: cutoff } },
      ],
    },
    include: { environment: true },
  });

  const svc = dockerService();
  const stopped: string[] = [];
  const failed: { name: string; error: string }[] = [];

  for (const c of idle) {
    const names = hostContainerNamesFor({
      environmentName: c.environment.name,
      port: c.port,
    });
    try {
      for (const n of names) await svc.stop(n);
      await prisma.dockerContainer.update({
        where: { id: c.id },
        data: { status: "STOPPED" },
      });
      stopped.push(c.name);
    } catch (err) {
      failed.push({ name: c.name, error: err instanceof Error ? err.message : String(err) });
    }
  }

  return NextResponse.json({
    ok: true,
    idleHours: IDLE_HOURS,
    cutoff: cutoff.toISOString(),
    stopped,
    failed,
  });
}

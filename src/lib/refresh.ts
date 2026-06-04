import { prisma } from "./prisma";
import { dockerService, wpSoftResetTarget } from "./docker";
import type { RefreshScope } from "@prisma/client";

export async function refreshOneContainer(containerId: string, actorId: string) {
  const container = await prisma.dockerContainer.findUnique({
    where: { id: containerId },
    include: { environment: true },
  });
  if (!container) throw new Error("Container not found");

  await prisma.dockerContainer.update({
    where: { id: containerId },
    data: { status: "REFRESHING" },
  });

  const svc = dockerService();
  try {
    // WordPress containers get a soft-reset: DB restored from golden snapshot,
    // container keeps running, credentials preserved.
    const wpTarget = wpSoftResetTarget({
      environmentName: container.environment.name,
      port: container.port,
      containerUrl: container.containerUrl,
      displayName: container.name,
    });

    let containerUrl: string;
    if (wpTarget && svc.softResetWp) {
      const result = await svc.softResetWp(wpTarget);
      containerUrl = result.containerUrl;
    } else {
      await svc.stopAndRemove(container.name);
      // linuxserver/kali-linux images listen on port 3000 inside the
      // container regardless of host port mapping.
      const envName = container.environment.name;
      const internalPort = envName === "Kali Linux" ? 3000 : undefined;
      const result = await svc.run(
        container.environment.dockerImage,
        container.name,
        container.port,
        { internalPort },
      );
      containerUrl = result.containerUrl;
    }

    await prisma.dockerContainer.update({
      where: { id: containerId },
      data: {
        status: "RUNNING",
        containerUrl,
        lastRefreshedAt: new Date(),
      },
    });
    await logRefresh(actorId, "ONE", containerId, container.environmentId, "OK");
    return { ok: true as const, containerUrl };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await prisma.dockerContainer.update({
      where: { id: containerId },
      data: { status: "ERROR" },
    });
    await logRefresh(actorId, "ONE", containerId, container.environmentId, "ERROR", msg);
    return { ok: false as const, message: msg };
  }
}

export async function refreshByEnvironment(environmentId: string, actorId: string) {
  const containers = await prisma.dockerContainer.findMany({
    where: { environmentId },
    select: { id: true },
  });
  let success = 0;
  let failure = 0;
  for (const c of containers) {
    const r = await refreshOneContainer(c.id, actorId);
    if (r.ok) success++;
    else failure++;
  }
  await logRefresh(
    actorId,
    "ENV",
    null,
    environmentId,
    failure === 0 ? "OK" : "PARTIAL",
    `success=${success} failure=${failure}`,
  );
  return { success, failure };
}

export async function logRefresh(
  userId: string,
  scope: RefreshScope,
  targetId: string | null,
  environmentId: string | null,
  status: string,
  message?: string,
) {
  await prisma.refreshLog.create({
    data: { userId, scope, targetId: targetId ?? null, environmentId: environmentId ?? null, status, message },
  });
}

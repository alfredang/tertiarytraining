// Seed the LOCAL dev database with the WordPress + Ubuntu environments
// and their demo containers — mirroring production for offline UI work.
//
// Run: npx tsx scripts/seed-local-containers.ts

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const HOST_IP = "168.231.119.201";

async function main() {
  console.log("Seeding environments + containers into local DB…");

  const wp = await prisma.environment.upsert({
    where: { name: "WordPress" },
    update: {},
    create: {
      name: "WordPress",
      description: "WordPress CMS sandbox for content management training.",
      dockerImage: "wordpress:latest",
      defaultPort: 8081,
      accessUrl: `http://${HOST_IP}:8081/`,
      enabled: true,
    },
  });

  for (let i = 1; i <= 5; i++) {
    const port = 8080 + i;
    const name = `WP Demo ${i}`;
    await prisma.dockerContainer.upsert({
      where: { name },
      update: {},
      create: {
        name,
        environmentId: wp.id,
        containerUrl: `http://${HOST_IP}:${port}/`,
        port,
        status: "RUNNING",
      },
    });
    console.log(`  ✓ ${name}`);
  }

  const ubuntu = await prisma.environment.upsert({
    where: { name: "Ubuntu" },
    update: {
      description: "Ubuntu 24.04 XFCE desktop in the browser (linuxserver/webtop).",
      dockerImage: "lscr.io/linuxserver/webtop:ubuntu-xfce",
    },
    create: {
      name: "Ubuntu",
      description: "Ubuntu 24.04 XFCE desktop in the browser (linuxserver/webtop).",
      dockerImage: "lscr.io/linuxserver/webtop:ubuntu-xfce",
      defaultPort: 8091,
      accessUrl: `http://${HOST_IP}:8091/`,
      enabled: true,
    },
  });

  for (let i = 1; i <= 5; i++) {
    const port = 8090 + i;
    const name = `Ubuntu Demo ${i}`;
    await prisma.dockerContainer.upsert({
      where: { name },
      update: {},
      create: {
        name,
        environmentId: ubuntu.id,
        containerUrl: `http://${HOST_IP}:${port}/`,
        port,
        status: "RUNNING",
      },
    });
    console.log(`  ✓ ${name}`);
  }

  const kali = await prisma.environment.upsert({
    where: { name: "Kali Linux" },
    update: {},
    create: {
      name: "Kali Linux",
      description: "Kali Linux rolling desktop in the browser (linuxserver/kali-linux). Install Kali toolsets via apt as needed.",
      dockerImage: "lscr.io/linuxserver/kali-linux:latest",
      defaultPort: 8096,
      accessUrl: `http://${HOST_IP}:8096/`,
      enabled: true,
    },
  });

  for (let i = 1; i <= 5; i++) {
    const port = 8095 + i;
    const name = `Kali Demo ${i}`;
    await prisma.dockerContainer.upsert({
      where: { name },
      update: {},
      create: {
        name,
        environmentId: kali.id,
        containerUrl: `http://${HOST_IP}:${port}/`,
        port,
        status: "RUNNING",
      },
    });
    console.log(`  ✓ ${name}`);
  }

  console.log("Done.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

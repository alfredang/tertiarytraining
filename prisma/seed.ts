import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const adminEmail = "admin@tertiary.local";
  const adminPassword = "ChangeMe123!";
  const passwordHash = await bcrypt.hash(adminPassword, 10);

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      name: "Administrator",
      passwordHash,
      role: "ADMIN",
      status: "ACTIVE",
    },
  });

  const samples = [
    {
      name: "WordPress",
      description: "WordPress CMS sandbox for content management training.",
      dockerImage: "wordpress:latest",
      defaultPort: 8081,
      accessUrl: "http://168.231.119.201:8081/",
    },
    {
      name: "Ubuntu",
      description: "Ubuntu 24.04 XFCE desktop in the browser (linuxserver/webtop).",
      dockerImage: "lscr.io/linuxserver/webtop:ubuntu-xfce",
      defaultPort: 8091,
      accessUrl: "http://168.231.119.201:8091/",
    },
    {
      name: "Kali Linux",
      description: "Kali rolling desktop in the browser (linuxserver/kali-linux). Install Kali toolsets via apt.",
      dockerImage: "lscr.io/linuxserver/kali-linux:latest",
      defaultPort: 8096,
      accessUrl: "http://168.231.119.201:8096/",
    },
  ];

  for (const env of samples) {
    await prisma.environment.upsert({
      where: { name: env.name },
      update: {},
      create: env,
    });
  }

  console.log(`Seed complete. Admin: ${adminEmail} / ${adminPassword}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

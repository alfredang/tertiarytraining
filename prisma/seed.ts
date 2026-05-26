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
      defaultPort: 8080,
      accessUrl: "http://localhost:8080",
    },
    {
      name: "Ubuntu",
      description: "Ubuntu 22.04 sandbox with shell access.",
      dockerImage: "ubuntu:22.04",
      defaultPort: 2222,
      accessUrl: "http://localhost:2222",
    },
    {
      name: "Linux Desktop",
      description: "Browser-based Linux desktop lab.",
      dockerImage: "linuxserver/webtop:latest",
      defaultPort: 3001,
      accessUrl: "http://localhost:3001",
    },
    {
      name: "Web Development Lab",
      description: "Node + Nginx web development sandbox.",
      dockerImage: "nginx:alpine",
      defaultPort: 8081,
      accessUrl: "http://localhost:8081",
    },
    {
      name: "Cybersecurity Lab",
      description: "Kali-style toolkit for hands-on security exercises.",
      dockerImage: "kalilinux/kali-rolling",
      defaultPort: 6080,
      accessUrl: "http://localhost:6080",
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

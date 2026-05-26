import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const password = "password123";
  const passwordHash = await bcrypt.hash(password, 10);
  const accounts = [
    { email: "angch@tertiaryinfotech.com", name: "Ang Ch" },
    { email: "amandahalim0014@gmail.com", name: "Amanda Halim" },
  ];
  for (const a of accounts) {
    await prisma.user.upsert({
      where: { email: a.email },
      update: { name: a.name, passwordHash, role: "ADMIN", status: "ACTIVE" },
      create: { email: a.email, name: a.name, passwordHash, role: "ADMIN", status: "ACTIVE" },
    });
    console.log(`✓ ${a.email}`);
  }

  // Also seed sample environments so the admin can demo learner/trainer views
  const samples = [
    { name: "WordPress", description: "WordPress CMS sandbox for content management training.", dockerImage: "wordpress:latest", defaultPort: 8080, accessUrl: "http://localhost:8080" },
    { name: "Ubuntu", description: "Ubuntu 22.04 sandbox with shell access.", dockerImage: "ubuntu:22.04", defaultPort: 2222, accessUrl: "http://localhost:2222" },
    { name: "Linux Desktop", description: "Browser-based Linux desktop lab.", dockerImage: "linuxserver/webtop:latest", defaultPort: 3001, accessUrl: "http://localhost:3001" },
    { name: "Web Development Lab", description: "Node + Nginx web development sandbox.", dockerImage: "nginx:alpine", defaultPort: 8081, accessUrl: "http://localhost:8081" },
    { name: "Cybersecurity Lab", description: "Kali-style toolkit for hands-on security exercises.", dockerImage: "kalilinux/kali-rolling", defaultPort: 6080, accessUrl: "http://localhost:6080" },
  ];
  for (const env of samples) {
    await prisma.environment.upsert({ where: { name: env.name }, update: {}, create: env });
  }
  console.log("✓ sample environments");
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());

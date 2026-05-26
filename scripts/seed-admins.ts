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
  // Sample envs match what seed-local-containers.ts seeds — kept in sync
  // so a fresh local DB matches the current production layout.
  const samples = [
    { name: "WordPress",  description: "WordPress CMS sandbox for content management training.",                                                   dockerImage: "wordpress:latest",                          defaultPort: 8081, accessUrl: "http://168.231.119.201:8081/" },
    { name: "Ubuntu",     description: "Ubuntu 24.04 XFCE desktop in the browser (linuxserver/webtop).",                                            dockerImage: "lscr.io/linuxserver/webtop:ubuntu-xfce",     defaultPort: 8091, accessUrl: "http://168.231.119.201:8091/" },
    { name: "Kali Linux", description: "Kali rolling desktop in the browser (linuxserver/kali-linux). Install Kali toolsets via apt as needed.",   dockerImage: "lscr.io/linuxserver/kali-linux:latest",      defaultPort: 8096, accessUrl: "http://168.231.119.201:8096/" },
  ];
  for (const env of samples) {
    await prisma.environment.upsert({ where: { name: env.name }, update: {}, create: env });
  }
  console.log("✓ sample environments");
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());

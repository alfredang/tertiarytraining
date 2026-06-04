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
      name: "Kali Linux",
      description: "Kali rolling desktop in the browser (linuxserver/kali-linux). Install Kali toolsets via apt.",
      dockerImage: "lscr.io/linuxserver/kali-linux:latest",
      defaultPort: 8096,
      accessUrl: "http://168.231.119.201:8096/",
    },
    {
      name: "Kubernetes",
      description: "Kubernetes playground (external, via Killercoda). Browser-based cluster — no setup, ~60 min session.",
      dockerImage: "external",
      defaultPort: 0,
      accessUrl: "https://killercoda.com/playgrounds/scenario/kubernetes",
    },
  ];

  for (const env of samples) {
    await prisma.environment.upsert({
      where: { name: env.name },
      update: {},
      create: env,
    });
  }

  const otpDefaults: Array<{ key: string; value: string }> = [
    { key: "otp_login_enabled", value: "false" },
    { key: "otp_auto_signup_enabled", value: "true" },
    { key: "otp_email_subject", value: "Your Tertiary Training login code" },
    {
      key: "otp_email_body",
      value:
        "Hi,\n\nYour one-time login code is {OTP}.\n\nIt expires in {EXPIRY_MINUTES} minutes. If you didn't request this code, you can safely ignore this email.\n\n— Tertiary Training\n{SITE_URL}",
    },
  ];
  for (const s of otpDefaults) {
    await prisma.systemSetting.upsert({
      where: { key: s.key },
      update: {},
      create: s,
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

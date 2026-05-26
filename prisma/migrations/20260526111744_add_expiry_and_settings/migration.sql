-- AlterTable
ALTER TABLE "User" ADD COLUMN     "expiresAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "SystemSetting" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,

    CONSTRAINT "SystemSetting_pkey" PRIMARY KEY ("key")
);

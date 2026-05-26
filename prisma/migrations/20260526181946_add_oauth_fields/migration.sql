-- Allow OAuth-only accounts (no password)
ALTER TABLE "User" ALTER COLUMN "passwordHash" DROP NOT NULL;

-- OAuth identity columns
ALTER TABLE "User" ADD COLUMN "googleId" TEXT;
ALTER TABLE "User" ADD COLUMN "githubId" TEXT;

CREATE UNIQUE INDEX "User_googleId_key" ON "User"("googleId");
CREATE UNIQUE INDEX "User_githubId_key" ON "User"("githubId");

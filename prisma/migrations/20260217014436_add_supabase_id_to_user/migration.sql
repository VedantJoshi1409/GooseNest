-- AlterTable: add supabaseId column with a temporary default, then make it required
ALTER TABLE "User" ADD COLUMN "supabaseId" TEXT;

-- Set a placeholder for existing rows (will be replaced on first login)
UPDATE "User" SET "supabaseId" = 'placeholder-' || "id" WHERE "supabaseId" IS NULL;

-- Now make it required and unique
ALTER TABLE "User" ALTER COLUMN "supabaseId" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "User_supabaseId_key" ON "User"("supabaseId");

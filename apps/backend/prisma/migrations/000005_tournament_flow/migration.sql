CREATE TYPE "TournamentStatus" AS ENUM ('OPEN', 'CLOSED');

ALTER TYPE "ImageAssetCategory" ADD VALUE 'TOURNAMENT_LOGO';

ALTER TABLE "Tournament"
  ADD COLUMN "description" TEXT,
  ADD COLUMN "logoAssetId" TEXT,
  ADD COLUMN "status" "TournamentStatus" NOT NULL DEFAULT 'OPEN',
  ADD COLUMN "closedAt" TIMESTAMP(3),
  ADD COLUMN "closedByUserId" TEXT,
  ADD COLUMN "closureReason" TEXT;

CREATE INDEX "Tournament_status_idx" ON "Tournament"("status");
CREATE INDEX "Tournament_storeId_status_idx" ON "Tournament"("storeId", "status");

ALTER TABLE "Tournament"
  ADD CONSTRAINT "Tournament_logoAssetId_fkey"
  FOREIGN KEY ("logoAssetId") REFERENCES "ManagedImageAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Tournament"
  ADD CONSTRAINT "Tournament_closedByUserId_fkey"
  FOREIGN KEY ("closedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

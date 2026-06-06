-- AlterTable
ALTER TABLE "Branch" ADD COLUMN     "lastModifiedAt" BIGINT NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Membership" ADD COLUMN     "lastModifiedAt" BIGINT NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "lastModifiedAt" BIGINT NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "VehicleEntry" ADD COLUMN     "lastModifiedAt" BIGINT NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "ChangeJournal" (
    "id" BIGSERIAL NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "operation" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "changedFields" JSONB,
    "timestamp" BIGINT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChangeJournal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ChangeJournal_entityType_entityId_idx" ON "ChangeJournal"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "ChangeJournal_timestamp_idx" ON "ChangeJournal"("timestamp");

-- CreateIndex
CREATE INDEX "ChangeJournal_deviceId_idx" ON "ChangeJournal"("deviceId");

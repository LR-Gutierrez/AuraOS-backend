-- AlterTable
ALTER TABLE "Membership" ADD COLUMN "cardUuid" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Membership_cardUuid_key" ON "Membership"("cardUuid");

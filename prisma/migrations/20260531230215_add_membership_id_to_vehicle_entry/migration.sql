-- AlterTable
ALTER TABLE "VehicleEntry" ADD COLUMN     "membershipId" TEXT;

-- CreateIndex
CREATE INDEX "VehicleEntry_membershipId_idx" ON "VehicleEntry"("membershipId");

-- AddForeignKey
ALTER TABLE "VehicleEntry" ADD CONSTRAINT "VehicleEntry_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "Membership"("id") ON DELETE SET NULL ON UPDATE CASCADE;

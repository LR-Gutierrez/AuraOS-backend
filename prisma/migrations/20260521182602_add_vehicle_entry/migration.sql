-- CreateTable
CREATE TABLE "VehicleEntry" (
    "id" TEXT NOT NULL,
    "plate" TEXT NOT NULL,
    "vehicleType" TEXT NOT NULL,
    "platePhotoUrl" TEXT,
    "frontPhotoUrl" TEXT,
    "rearPhotoUrl" TEXT,
    "leftPhotoUrl" TEXT,
    "rightPhotoUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VehicleEntry_pkey" PRIMARY KEY ("id")
);

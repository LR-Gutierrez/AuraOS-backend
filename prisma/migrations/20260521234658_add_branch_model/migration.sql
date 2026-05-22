-- CreateTable
CREATE TABLE "Branch" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "motorcycleCapacity" INTEGER NOT NULL DEFAULT 0,
    "lightVehicleCapacity" INTEGER NOT NULL DEFAULT 0,
    "heavyVehicleCapacity" INTEGER NOT NULL DEFAULT 0,
    "motorcycleRate" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "lightVehicleRate" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "heavyVehicleRate" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Branch_pkey" PRIMARY KEY ("id")
);

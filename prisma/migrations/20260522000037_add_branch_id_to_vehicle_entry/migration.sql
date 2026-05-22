-- Add branchId as nullable first (existing rows need backfill)
ALTER TABLE "VehicleEntry" ADD COLUMN "branchId" TEXT;

-- Ensure a default branch exists for legacy entries
INSERT INTO "Branch" (
    "id",
    "name",
    "address",
    "motorcycleCapacity",
    "lightVehicleCapacity",
    "heavyVehicleCapacity",
    "motorcycleRate",
    "lightVehicleRate",
    "heavyVehicleRate",
    "currency",
    "createdAt",
    "updatedAt"
)
SELECT
    gen_random_uuid()::text,
    'Sucursal por defecto',
    NULL,
    0,
    0,
    0,
    0.0,
    0.0,
    0.0,
    'USD',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "Branch");

-- Assign all entries to the oldest branch (or the one just created)
UPDATE "VehicleEntry"
SET "branchId" = (SELECT "id" FROM "Branch" ORDER BY "createdAt" ASC LIMIT 1)
WHERE "branchId" IS NULL;

-- Enforce NOT NULL and relation
ALTER TABLE "VehicleEntry" ALTER COLUMN "branchId" SET NOT NULL;

CREATE INDEX "VehicleEntry_branchId_idx" ON "VehicleEntry"("branchId");

ALTER TABLE "VehicleEntry" ADD CONSTRAINT "VehicleEntry_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

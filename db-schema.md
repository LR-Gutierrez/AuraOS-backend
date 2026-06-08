# Esquema de Base de Datos — `aura_db`

## Tablas

### `User`

| Columna | Tipo | Restricciones | Default | Notas |
|---|---|---|---|---|
| `id` | `TEXT` | PK, NOT NULL | `gen_random_uuid()` | UUID |
| `email` | `TEXT` | NOT NULL, UNIQUE | — | Correo único |
| `password` | `TEXT` | NOT NULL | — | Hash bcrypt |
| `name` | `TEXT` | NOT NULL | — | Nombre del usuario |
| `role` | `TEXT` | NOT NULL | `'operator'` | `admin` \| `operator` |
| `biometricPublicKey` | `TEXT` | NULLABLE | — | Clave pública RSA (base64) |
| `avatarUrl` | `TEXT` | NULLABLE | — | URL del avatar |
| `createdAt` | `TIMESTAMP(3)` | NOT NULL | `CURRENT_TIMESTAMP` | |
| `updatedAt` | `TIMESTAMP(3)` | NOT NULL | — | Auto-actualizado |

**Índices:** `User_email_key` (UNIQUE)

---

### `Branch`

| Columna | Tipo | Restricciones | Default | Notas |
|---|---|---|---|---|
| `id` | `TEXT` | PK, NOT NULL | `gen_random_uuid()` | UUID |
| `name` | `TEXT` | NOT NULL | — | Nombre de sucursal |
| `address` | `TEXT` | NULLABLE | — | Dirección |
| `motorcycleCapacity` | `INTEGER` | NOT NULL | `0` | Cajones para motos |
| `lightVehicleCapacity` | `INTEGER` | NOT NULL | `0` | Cajones para autos |
| `heavyVehicleCapacity` | `INTEGER` | NOT NULL | `0` | Cajones para camiones |
| `motorcycleRate` | `DOUBLE PRECISION` | NOT NULL | `0.0` | Tarifa diaria moto |
| `lightVehicleRate` | `DOUBLE PRECISION` | NOT NULL | `0.0` | Tarifa diaria auto |
| `heavyVehicleRate` | `DOUBLE PRECISION` | NOT NULL | `0.0` | Tarifa diaria camión |
| `motorcycleOvernightRate` | `DOUBLE PRECISION` | NOT NULL | `0.0` | Tarifa nocturna extra moto |
| `lightVehicleOvernightRate` | `DOUBLE PRECISION` | NOT NULL | `0.0` | Tarifa nocturna extra auto |
| `heavyVehicleOvernightRate` | `DOUBLE PRECISION` | NOT NULL | `0.0` | Tarifa nocturna extra camión |
| `openTimeWeekday` | `TEXT` | NOT NULL | `'07:00'` | Apertura entre semana |
| `closeTimeWeekday` | `TEXT` | NOT NULL | `'23:00'` | Cierre entre semana |
| `openTimeWeekend` | `TEXT` | NOT NULL | `'09:00'` | Apertura fin de semana |
| `closeTimeWeekend` | `TEXT` | NOT NULL | `'22:00'` | Cierre fin de semana |
| `currency` | `TEXT` | NOT NULL | `'USD'` | `USD` \| `MXN` \| `EUR` |
| `favorite` | `BOOLEAN` | NOT NULL | `false` | Marcada como favorita |
| `createdAt` | `TIMESTAMP(3)` | NOT NULL | `CURRENT_TIMESTAMP` | |
| `updatedAt` | `TIMESTAMP(3)` | NOT NULL | — | |

**Relaciones:** 1:N → `VehicleEntry`, 1:N → `Membership`

---

### `VehicleEntry`

| Columna | Tipo | Restricciones | Default | Notas |
|---|---|---|---|---|
| `id` | `TEXT` | PK, NOT NULL | `gen_random_uuid()` | UUID |
| `plate` | `TEXT` | NOT NULL | — | Placa del vehículo |
| `vehicleType` | `TEXT` | NOT NULL | — | `motorcycle` \| `light` \| `heavy` |
| `isVip` | `BOOLEAN` | NOT NULL | `false` | `true` si es entrada de membresía |
| `membershipId` | `TEXT` | NULLABLE | — | FK → `Membership.id` |
| `branchId` | `TEXT` | NOT NULL | — | FK → `Branch.id` |
| `platePhotoUrl` | `TEXT` | NULLABLE | — | Foto de placa |
| `frontPhotoUrl` | `TEXT` | NULLABLE | — | Foto frontal |
| `rearPhotoUrl` | `TEXT` | NULLABLE | — | Foto trasera |
| `leftPhotoUrl` | `TEXT` | NULLABLE | — | Foto izquierda |
| `rightPhotoUrl` | `TEXT` | NULLABLE | — | Foto derecha |
| `exitedAt` | `TIMESTAMP(3)` | NULLABLE | — | `NULL` = sigue estacionado |
| `createdAt` | `TIMESTAMP(3)` | NOT NULL | `CURRENT_TIMESTAMP` | Hora de entrada |

**Índices:**
- `VehicleEntry_branchId_idx` — `branchId`
- `VehicleEntry_plate_idx` — `plate`
- `VehicleEntry_membershipId_idx` — `membershipId`

**Foreign Keys:**
- `branchId` → `Branch(id)` — ON DELETE RESTRICT, ON UPDATE CASCADE
- `membershipId` → `Membership(id)` — ON DELETE SET NULL, ON UPDATE CASCADE

---

### `Membership`

| Columna | Tipo | Restricciones | Default | Notas |
|---|---|---|---|---|
| `id` | `TEXT` | PK, NOT NULL | `gen_random_uuid()` | UUID |
| `memberName` | `TEXT` | NOT NULL | — | Nombre del miembro |
| `tier` | `TEXT` | NOT NULL | `'Regular'` | `Regular` \| `Premium` \| `Elite` |
| `cardUuid` | `TEXT` | UNIQUE, NULLABLE | — | UUID de tarjeta NFC |
| `startDate` | `TIMESTAMP(3)` | NOT NULL | — | Inicio de membresía |
| `endDate` | `TIMESTAMP(3)` | NOT NULL | — | Expiración |
| `isActive` | `BOOLEAN` | NOT NULL | `true` | |
| `branchId` | `TEXT` | NOT NULL | — | FK → `Branch.id` |
| `createdAt` | `TIMESTAMP(3)` | NOT NULL | `CURRENT_TIMESTAMP` | |
| `updatedAt` | `TIMESTAMP(3)` | NOT NULL | — | |

**Índices:**
- `Membership_branchId_idx` — `branchId`
- `Membership_cardUuid_key` — UNIQUE sobre `cardUuid`

**Foreign Keys:**
- `branchId` → `Branch(id)` — ON DELETE CASCADE, ON UPDATE CASCADE

**Relaciones:** 1:N → `VehicleEntry` (FK `membershipId` en VehicleEntry, ON DELETE SET NULL)

---

## Diagrama de Relaciones

```
User (independiente)

Branch (1) ──< (N) VehicleEntry
  │
  └── (1) ──< (N) Membership ──< (1) VehicleEntry (opcional, via membershipId)
```

## Comportamiento de Borrado en Cascada

| Acción | Efecto |
|---|---|
| Borrar `Branch` con `VehicleEntry` referenciando | **RESTRICT** (no se puede borrar) |
| Borrar `Branch` | **CASCADE** a `Membership` |
| Borrar `Membership` | **SET NULL** en `membershipId` de `VehicleEntry` |

# cardUuid — Integración Frontend

## Endpoint nuevo

**`GET /api/v1/memberships/by-card/:cardUuid`**

Busca una membresía por el UUID de la tarjera NFC.

| Respuesta | Descripción |
|---|---|
| `200` | Retorna la membresía encontrada |
| `404` | `"No se encontró una membresía con la tarjeta {cardUuid}"` |

---

## Endpoint existente (registrar ingreso)

**`POST /api/v1/vehicle-entries`** (multipart/form-data)

Para registrar la entrada de un socio por NFC, envía:

| Campo | Valor |
|---|---|
| `plate` | `"NFC"` (o cualquier dummy) |
| `vehicleType` | `"light"` |
| `branchId` | ID de la sucursal |
| `membershipId` | ID obtenido del `by-card` endpoint |
| `platePhoto` | Foto de la placa (obligatorio) |

El backend fuerza `isVip: true`, valida que la membresía esté activa, y bloquea si el socio ya tiene un vehículo dentro.

---

## Archivos modificados

| Archivo | Cambio |
|---|---|
| `prisma/schema.prisma` | `cardUuid String? @unique` en Membership |
| `prisma/migrations/...add_card_uuid...` | Migración con columna + unique index |
| `src/memberships/dto/create-membership.dto.ts` | `cardUuid` opcional |
| `src/memberships/memberships.service.ts` | Método `findByCardUuid()` |
| `src/memberships/memberships.controller.ts` | Ruta `by-card/:cardUuid` (antes de `:id`) |
| `prisma/seed.ts` | Juan Pérez y María García con `cardUuid` |

---

## Datos de prueba (seed)

| Miembro | cardUuid | Vigencia |
|---|---|---|
| Juan Pérez | `A1B2C3D4-E5F6-7890-ABCD-EF1234567890` | 1 mes activo |
| María García | `00000000-0000-0000-0000-000000000001` | 30 min activa |
| Carlos López | (sin tarjeta) | Expirado |

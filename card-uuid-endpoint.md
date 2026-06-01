# cardUuid — Integración Frontend

## Endpoints

### Buscar membresía por tarjeta NFC

**`GET /api/v1/memberships/by-card/:cardUuid`**

| Respuesta | Descripción |
|---|---|
| `200` | Retorna la membresía encontrada |
| `404` | `"No se encontró una membresía con la tarjeta {cardUuid}"` |

### Registrar tarjeta a un socio

**`POST /api/v1/memberships/:id/register-card`**

```json
{ "cardUuid": "A1B2C3D4-E5F6-7890-ABCD-EF1234567890" }
```

| Respuesta | Descripción |
|---|---|
| `200` | Tarjeta asignada correctamente |
| `404` | El socio no existe |
| `409` | `"La tarjeta {cardUuid} ya está asignada a otro socio"` |

### Desvincular tarjeta de un socio

**`POST /api/v1/memberships/:id/unregister-card`**

| Respuesta | Descripción |
|---|---|
| `200` | Tarjeta removida (`cardUuid: null`) |
| `400` | `"El socio no tiene una tarjeta asignada"` |
| `404` | El socio no existe |

---

## Registrar ingreso por NFC

**`POST /api/v1/vehicle-entries`** (multipart/form-data)

| Campo | Valor |
|---|---|
| `plate` | `"NFC"` (dummy) |
| `vehicleType` | `"light"` |
| `branchId` | ID de la sucursal |
| `membershipId` | ID obtenido del `by-card` endpoint |
| `platePhoto` | Foto de la placa |

El backend fuerza `isVip: true`, valida membresía activa, y bloquea si el socio ya tiene un vehículo dentro.

---

## Archivos modificados

| Archivo | Cambio |
|---|---|
| `prisma/schema.prisma` | `cardUuid String? @unique` en Membership |
| `prisma/migrations/...add_card_uuid...` | Migración con columna + unique index |
| `src/memberships/dto/create-membership.dto.ts` | `cardUuid` opcional |
| `src/memberships/dto/register-card.dto.ts` | DTO para registrar tarjeta |
| `src/memberships/memberships.service.ts` | `findByCardUuid()`, `registerCard()`, `unregisterCard()` |
| `src/memberships/memberships.controller.ts` | Rutas `by-card/:cardUuid`, `register-card`, `unregister-card` |
| `prisma/seed.ts` | Juan Pérez y María García con `cardUuid` |

---

## Datos de prueba (seed)

| Miembro | cardUuid | Vigencia |
|---|---|---|
| Juan Pérez | `A1B2C3D4-E5F6-7890-ABCD-EF1234567890` | 1 mes activo |
| María García | `00000000-0000-0000-0000-000000000001` | 30 min activa |
| Carlos López | (sin tarjeta) | Expirado |

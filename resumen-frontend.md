# Resumen para Frontend — SmartPark OS Backend

## Endpoints disponibles

### Auth
| Método | Ruta | Auth | Body |
|--------|------|:----:|------|
| POST | `/api/v1/register` | ❌ | `{ email, password, name, role? }` |
| POST | `/api/v1/login` | ❌ | `{ email, password }` → devuelve `token` |
| POST | `/api/v1/biometric-enroll` | ❌ | `{ userId, publicKey }` |
| POST | `/api/v1/biometric-login` | ❌ | `{ userId, challenge, signature }` |

### Sucursales
| Método | Ruta | Auth |
|--------|------|:----:|
| GET | `/api/v1/branches` | ❌ |
| GET | `/api/v1/branches/:id` | ❌ |
| POST | `/api/v1/branches` | ❌ |
| PATCH | `/api/v1/branches/:id` | ❌ |
| DELETE | `/api/v1/branches/:id` | ❌ (204) |

### Ingresos/Salidas
| Método | Ruta | Auth | Descripción |
|--------|------|:----:|-------------|
| POST | `/api/v1/vehicle-entries` | ❌ | Multipart: plate, vehicleType, branchId, isVip?, fotos |
| PATCH | `/api/v1/vehicle-entries/:id/exit` | ❌ | Body opcional: `{ exitedAt }` |
| GET | `/api/v1/vehicle-entries` | ❌ | Filtros: `?branchId=&exited=&from=&to=&page=&limit=` |
| GET | `/api/v1/vehicle-entries/:id` | ❌ | Detalle de un registro |
| GET | `/api/v1/branches/:branchId/entries/summary` | ❌ | Resumen del día |

### Analytics
| Método | Ruta | Auth | Descripción |
|--------|------|:----:|-------------|
| GET | `/api/v1/analytics/summary` | ❌ | Resumen completo con tendencias y hora pico. Query: `?branchId=&date=&inboundThresholdMinutes=` |

### Dashboard (requiere JWT)
| Método | Ruta | Auth |
|--------|------|:----:|
| GET | `/api/v1/branches/:branchId/dashboard` | ✅ Bearer token |

### Membresías
| Método | Ruta | Auth |
|--------|------|:----:|
| GET | `/api/v1/memberships` | ❌ |
| GET | `/api/v1/memberships/:id` | ❌ |
| POST | `/api/v1/memberships` | ❌ |
| PATCH | `/api/v1/memberships/:id` | ❌ |
| DELETE | `/api/v1/memberships/:id` | ❌ (204) |

---

## Vehicle Entries — Filtros en GET

```
GET /api/v1/vehicle-entries?exited=true&branchId=<uuid>&page=1&limit=20
```

| Parámetro | Tipo | Efecto |
|-----------|------|--------|
| `branchId` | string | Filtra por sucursal |
| `exited` | `"true"` o `"false"` | `true` → solo salidas (exitedAt != null), `false` → solo activos |
| `from` | ISO string | createdAt >= from |
| `to` | ISO string | createdAt <= to |
| `page` | number | Página (default 1) |
| `limit` | number | Por página (default 50) |

**Respuesta:**
```json
{
  "data": [
    {
      "id": "uuid",
      "plate": "ABC-123",
      "vehicleType": "light",
      "isVip": false,
      "exitedAt": "2026-05-24T18:09:31.081Z",
      "createdAt": "2026-05-21T23:17:56.583Z",
      "duration": "2d 18h 51m",
      "fee": 15.00,
      "platePhotoUrl": "uploads/vehicle-entries/abc.jpg",
      "branch": { "id": "uuid", "name": "Sucursal Centro", ... }
    }
  ],
  "meta": {
    "total": 150,
    "page": 1,
    "limit": 50,
    "totalPages": 3,
    "todaySummary": {
      "exitedCount": 5,
      "totalRevenue": 45.00
    }
  }
}
```

- `duration` se calcula como diferencia entre `createdAt` y `exitedAt`. Solo aparece si `exitedAt` no es null.
- `fee` = `rate × ceil(días transcurridos)`, mínimo 1 día.
- `todaySummary.exitedCount` = vehículos que salieron hoy (desde 00:00 hs).
- `todaySummary.totalRevenue` = suma de fees de los que salieron hoy.

---

## Summary Endpoint

```
GET /api/v1/branches/:branchId/entries/summary
```

```json
{
  "todayExits": 5,
  "todayRevenue": 45.00,
  "averageStay": "4h 30m",
  "peakExitHour": 17
}
```

---

## Analytics Summary

```
GET /api/v1/analytics/summary?branchId=<uuid>&date=YYYY-MM-DD&inboundThresholdMinutes=30
```

| Query param | Tipo | Default | Descripción |
|-------------|------|---------|-------------|
| `branchId` | string | **requerido** | UUID de la sucursal |
| `date` | string (YYYY-MM-DD) | Hoy (UTC) | Fecha del resumen |
| `inboundThresholdMinutes` | number | 30 | Minutos para clasificar INBOUND vs OCCUPIED |

**Respuesta:**
```json
{
  "branchId": "uuid",
  "date": "2026-05-27",
  "totalCapacity": 70,
  "inboundCount": 3,
  "activeCount": 15,
  "outboundCount": 22,
  "totalRevenue": 44.00,
  "avgDurationMinutes": 145,
  "inboundTrendPercent": 50,
  "activeTrendPercent": -7,
  "outboundTrendPercent": 10,
  "revenueTrendPercent": 12,
  "peakHourRevenue": 8.00,
  "peakHourLabel": "14:00 - 15:00",
  "inboundThresholdMinutes": 30
}
```

Reemplaza las **3 llamadas** que hacía el frontend (`exited=true`, `exited=false`, `exited=true&from=ayer&to=ayer`) y los **5 valores quemados** (capacidad, hora pico, tendencia de salidas, umbral INBOUND, activos de ayer).

### Clasificación de actividad

| Tipo | Condición |
|------|-----------|
| `INBOUND` | `exitedAt IS NULL` y `createdAt` en los últimos N minutos |
| `OCCUPIED` | `exitedAt IS NULL` y `createdAt` anterior al umbral |
| `OUTBOUND` | `exitedAt IS NOT NULL` y `exitedAt` es de hoy |

`activeCount = inboundCount + occupiedCount` (todos los estacionados).

### Tendencias

```
trend = ((hoy - ayer) / ayer) * 100
```
- `ayer === 0` y `hoy > 0` → `+100`
- Ambos `0` → `0`
- Redondeado a entero

### Peak hour

Recaudación agrupada por hora (00:00–01:00, 01:00–02:00, ...). Devuelve la hora con **mayor recaudación**, no la de más salidas.

---

## Dashboard

```
GET /api/v1/branches/:branchId/dashboard
Authorization: Bearer <token>
```

```json
{
  "occupancyPercent": 82,
  "occupiedBays": 410,
  "totalBays": 500,
  "trendPercent": 4,
  "dailyRevenue": 124.00,
  "activeMemberships": 42,
  "totalMemberships": 50,
  "criticalAlertsCount": 2,
  "expiringMemberships": [
    { "memberName": "Juan Pérez", "tier": "Elite", "timeLeft": "14m" }
  ],
  "vipArrivals": [
    { "guestName": "ABC-123", "slot": "VIP-1" }
  ]
}
```

- `occupiedBays` cuenta solo vehículos **sin salir** (exitedAt = null).
- `vipArrivals` solo muestra VIPs que ingresaron en la última hora y no han salido.
- `dailyRevenue` suma de (cantidad de cada tipo × su tarifa) para ingresos de hoy.

---

## vehicleType válidos

Solo se aceptan: **`motorcycle`**, **`light`**, **`heavy`**.  
Cualquier otro valor devuelve error 400. Se normaliza a minúsculas automáticamente.

---

## Fotos

Las rutas devueltas son **relativas**: `uploads/vehicle-entries/abc123.jpg`  
Se sirven en: `http://192.168.2.112:3000/uploads/vehicle-entries/abc123.jpg`  
Tamaño máximo: **10 MB** por archivo.

---

## Reglas de Negocio

| Regla | Detalle |
|-------|---------|
| **1 heavy = 3 light** | Ocupación se calcula en equivalentes: `heavy × 3` |
| **Ocupación** | Solo vehículos sin salir (exitedAt = null) |
| **Fee** | `rate × ceil(días)` mínimo 1 día |
| **Duración** | Diferencia entre createdAt y exitedAt |
| **todaySummary** | Basado en exitedAt del día actual (00:00–23:59) |
| **Alertas críticas** | Membresías con < 24h para vencer |
| **VIP arrivals** | VIPs que ingresaron en la última hora y no han salido |

---

## Notas técnicas

- CORS abierto a cualquier origen.
- Los POST/PATCH tienen validación automática con `class-validator`.
- El token JWT expira en 24h.
- La base de datos tiene índices en `branchId` para VehicleEntry y Membership.

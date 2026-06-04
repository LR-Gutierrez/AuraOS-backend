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

| Campo | Cálculo |
|-------|---------|
| `occupancyPercent` | (activos / capacidad total) × 100 |
| `occupiedBays` | Espacios ocupados ahora (`exitedAt = null`) |
| `totalBays` | `motorcycleCapacity + lightVehicleCapacity + heavyVehicleCapacity` |
| `trendPercent` | % de cambio vs ayer a la misma hora |
| `dailyRevenue` | Suma de tarifas planas de ingresos de hoy (sin pernocta) |
| `activeMemberships` | Membresías activas de esta sucursal |
| `criticalAlertsCount` | Membresías activas que vencen en < 24h |
| `vipArrivals` | VIPs que ingresaron en la última hora y no han salido |

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

## Cálculo de Fee (Tarifa Plana + Pernocta)

Desde el 27/05/2026 el fee se calcula con **dos tarifas**:

```
fee = (días × tarifa_plana) + (noches × tarifa_pernocta)
```

- **días** = días calendario entre `createdAt` y `exitedAt` (inclusive)
- **noches** = cruces de medianoche = `días - 1`

| Escenario | Tarifa plana | Pernocta | Total (light: $5 / $15) |
|-----------|:-----------:|:--------:|:----------------------:|
| 10:00→14:00 mismo día | 1 | 0 | **$5** |
| 20:00→01:00 (cruza medianoche) | 2 | 1 | **$25** |
| 10:00→10:00 día siguiente | 2 | 1 | **$25** |
| Sáb 10:00→Lun 10:00 | 3 | 2 | **$45** |

## Tarifas por sucursal

Cada `Branch` tiene estas tarifas configurables:

| Campo | Default | Descripción |
|-------|---------|-------------|
| `motorcycleRate` | 0.0 | Tarifa plana — moto |
| `lightVehicleRate` | 0.0 | Tarifa plana — liviano |
| `heavyVehicleRate` | 0.0 | Tarifa plana — pesado |
| `motorcycleOvernightRate` | 0.0 | Pernocta — moto |
| `lightVehicleOvernightRate` | 0.0 | Pernocta — liviano |
| `heavyVehicleOvernightRate` | 0.0 | Pernocta — pesado |
| `openTimeWeekday` | 07:00 | Apertura Lun–Sáb |
| `closeTimeWeekday` | 23:00 | Cierre Lun–Sáb |
| `openTimeWeekend` | 09:00 | Apertura Dom/Feriado |
| `closeTimeWeekend` | 22:00 | Cierre Dom/Feriado |

## Reglas de Negocio

| Regla | Detalle |
|-------|---------|
| **Capacidad total** | Suma directa de espacios físicos: `motorcycle + light + heavy` |
| **Ocupación** | Solo vehículos sin salir (exitedAt = null) |
| **Fee** | `(días × tarifa_plana) + (noches × tarifa_pernocta)` |
| **Duración** | Diferencia entre createdAt y exitedAt |
| **todaySummary** | Basado en exitedAt del día actual (00:00–23:59) |
| **Alertas críticas** | Membresías con < 24h para vencer |
| **VIP arrivals** | VIPs que ingresaron en la última hora y no han salido |

---

## ⚠️ Cambios que requiere el frontend (Mayo 2026)

### 1. Modelo `Branch` — nuevos campos

El objeto `Branch` ahora incluye:

```kotlin
data class Branch(
    val id: String,
    val name: String,
    val address: String?,
    val motorcycleCapacity: Int,
    val lightVehicleCapacity: Int,
    val heavyVehicleCapacity: Int,
    val motorcycleRate: Double,
    val lightVehicleRate: Double,
    val heavyVehicleRate: Double,
    // NUEVOS:
    val motorcycleOvernightRate: Double,   // tarifa pernocta moto
    val lightVehicleOvernightRate: Double, // tarifa pernocta liviano
    val heavyVehicleOvernightRate: Double, // tarifa pernocta pesado
    val openTimeWeekday: String,           // "07:00"
    val closeTimeWeekday: String,          // "23:00"
    val openTimeWeekend: String,           // "09:00"
    val closeTimeWeekend: String,          // "22:00"
    // ...
)
```

### 2. Fee — el cálculo cambió

**Antes** (lo que el frontend calculaba localmente):
```
fee = rate × ceil(días)
```

**Ahora** (lo devuelve el backend automáticamente):
```
fee = (días × tarifa_plana) + (noches × tarifa_pernocta)
```

El frontend ya **no debe calcular fees localmente**. El backend devuelve `fee` en cada entry y `totalRevenue` en todos los resúmenes.

### 3. Vehicle Entry response — mismo formato, nuevo cálculo

El `fee` que recibes en `GET /api/v1/vehicle-entries` y `PATCH /api/v1/vehicle-entries/:id/exit` ahora usa la nueva fórmula. No hay cambios en la estructura del JSON, solo en el valor.

### 4. todayRevenue — también cambiado

Todos los endpoints que devuelven `todayRevenue` o `totalRevenue` usan la nueva fórmula:
- `GET /api/v1/vehicle-entries` → `meta.todaySummary.totalRevenue`
- `GET /api/v1/branches/:branchId/entries/summary` → `todayRevenue`
- `GET /api/v1/analytics/summary` → `totalRevenue`

### 5. Regla de corte (midnight)

La medianoche (00:00 UTC del servidor) es el punto de corte. Si el vehículo cruza la medianoche, se cobra una pernocta adicional. Esto es automático, el frontend no necesita calcularlo.

### 6. UI — sugerencias

- **Pantalla de tarifas**: Mostrar las tarifas plana y pernocta de cada Branch. Usar los nuevos campos `*OvernightRate`.
- **Pantalla de detalle de salida**: Mostrar desglose opcional: "X días tarifa plana + Y noches pernocta".
- **Horarios**: Si la app muestra horarios, usar `openTimeWeekday`/`closeTimeWeekday` y `openTimeWeekend`/`closeTimeWeekend` del Branch.

---

## Notas técnicas

- CORS abierto a cualquier origen.
- Los POST/PATCH tienen validación automática con `class-validator`.
- El token JWT expira en 24h. Solo el dashboard requiere auth.
- La base de datos tiene índices en `branchId` para VehicleEntry y Membership.

## Datos de prueba

```sql
-- Membresías próximas a vencer (< 24h)
INSERT INTO "Membership" (id, "memberName", tier, "startDate", "endDate", "isActive", "branchId")
VALUES
  (gen_random_uuid(), 'Juan Pérez', 'Elite',   NOW(), NOW() + interval '1 hour', true, '<branch-id>'),
  (gen_random_uuid(), 'María García', 'Premium', NOW(), NOW() + interval '30 minutes', true, '<branch-id>');

-- Vehículo VIP (isVip: true al crearlo)
POST /api/v1/vehicle-entries con form-data: isVip="true"
```

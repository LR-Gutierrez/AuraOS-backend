# Tareas Pendientes: Migrar Lógica del Frontend al Backend

## 🔴 Crítico — El backend debe filtrar correctamente

### 1. Filtro `exited=true` no funciona
**URL:** `GET /api/v1/vehicle-entries?exited=true`

**Problema:** La respuesta incluye entradas con `exitedAt: null`, cuando `exited=true` debería devolver SOLO las que tienen `exitedAt` con valor.

**Ejemplo concreto:** La petición devuelve 6 registros, pero 3 tienen `exitedAt: null`.

**Solución:** El query param `exited` debe aplicar un `WHERE exitedAt IS NOT NULL` (para `true`) o `WHERE exitedAt IS NULL` (para `false`).

---

## 🟡 Propuesta — Endpoints que el frontend NECESITA

### 2. `GET /api/v1/vehicle-entries` — Devolver historial completo con `exited=true`

Actualmente el frontend:
- Filtra localmente los que tienen `exitedAt != null`
- Calcula `todayCount` iterando sobre todas las entries y contando las que salieron hoy
- Calcula `todayRevenue = Σ (rate × days(createdAt, exitedAt))` para las de hoy
- Calcula `durationLabel = formatDuration(createdAt, exitedAt)`
- Calcula `fee = rate × ceil(durationInDays)`

**Todo esto debe hacerlo el backend.** Propuesta de response:

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
      "duration": "3d 18h 51m",
      "fee": 9.00,
      "branch": { ... }
    }
  ],
  "meta": {
    "total": 150,
    "page": 1,
    "limit": 20,
    "totalPages": 8
  },
  "todaySummary": {
    "exitedCount": 5,
    "totalRevenue": 45.00
  }
}
```

**Campos nuevos necesarios en cada entry:**
| Campo | Tipo | Cálculo |
|-------|------|---------|
| `duration` | string | Diferencia entre `createdAt` y `exitedAt` en formato legible: `"3d 18h 51m"` |
| `fee` | number | `rate × ceil((exitedAt - createdAt) / 1 día)`, mínimo 1 día. Usar la tarifa del `vehicleType` de la sucursal asociada. |

**Campos nuevos en el meta:**
| Campo | Tipo | Cálculo |
|-------|------|---------|
| `todaySummary.exitedCount` | number | Cantidad de vehículos que salieron hoy (desde las 00:00 hs locales) |
| `todaySummary.totalRevenue` | number | Suma de `fee` para los vehículos que salieron hoy |

### 3. `GET /api/v1/branches/:branchId/entries/summary`
Endpoint específico para el resumen del historial (evita cargar todas las entries).

**Response:**
```json
{
  "todayExits": 5,
  "todayRevenue": 45.00,
  "averageStay": "4h 30m",
  "peakExitHour": 17
}
```

---

## 🟢 Propuesta — Mejoras adicionales

### 4. Validación de `vehicleType` en el registro de entrada
Actualmente se está guardando `"moto"` en lugar de `"motorcycle"`. El backend debe rechazar o normalizar:
- Aceptar solo: `motorcycle`, `light`, `heavy`
- Devolver error 400 si el valor no es válido

### 5. Endpoint de fotos
Las URLs de fotos vienen como rutas absolutas locales del servidor (`/home/luis/development/auraos-backend/uploads/...`). El frontend no puede cargarlas así. El backend ya sirve archivos estáticos en `/uploads/`, pero las URLs deberían ser relativas:
- Actual: `"/home/luis/development/auraos-backend/uploads/vehicle-entries/abc.jpg"`
- Debería: `"uploads/vehicle-entries/abc.jpg"` (URL relativa para servirse como `http://192.168.2.112:3000/uploads/vehicle-entries/abc.jpg`)

### 6. Paginación en historial de salidas
El frontend carga todas las entries sin paginar. Para sucursales con mucho movimiento, el backend debe forzar un límite razonable (ej. `limit=50` por defecto) y el frontend debe poder navegar páginas.

---

## 📊 Resumen: Qué hace el frontend que debería hacer el backend

| # | Lógica | Actualmente en | Debería estar en |
|---|--------|---------------|------------------|
| 1 | Filtrar `exitedAt != null` | Frontend (fallback) | Backend (`?exited=true`) |
| 2 | Contar salidas de hoy | `HistoryViewModel.processEntries()` | Backend (`todaySummary.exitedCount`) |
| 3 | Sumar ingresos de hoy | `HistoryViewModel.processEntries()` | Backend (`todaySummary.totalRevenue`) |
| 4 | Calcular duración `"3d 18h"` | `DateUtils.formatDuration()` | Backend (campo `duration`) |
| 5 | Calcular tarifa `rate × days` | `HistoryViewModel.calculateDays()` | Backend (campo `fee`) |
| 6 | Mostrar totales del día | `HistoryActivity.bindData()` | Backend o endpoint separado |

---
*Creado desde el frontend Android — SmartPark OS*

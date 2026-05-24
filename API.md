# API Walkthrough — SmartPark OS

**Base URL:** `http://192.168.2.112:3000`

---

## 1. Autenticación

### POST `/api/v1/register`
Crear un nuevo operador/usuario del sistema.

**Body (JSON):**
```json
{
  "email": "correo@ejemplo.com",
  "password": "secreta123",
  "name": "Juan Pérez",
  "role": "operator"
}
```
`role` puede ser `"operator"` (default), `"admin"`, etc.

**Respuesta:**
```json
{
  "success": true,
  "message": "Usuario creado exitosamente",
  "user": {
    "id": "uuid",
    "email": "correo@ejemplo.com",
    "name": "Juan Pérez",
    "role": "operator"
  }
}
```

---

### POST `/api/v1/login`
Iniciar sesión con correo y contraseña. **Devuelve el JWT.**

**Body (JSON):**
```json
{
  "email": "correo@ejemplo.com",
  "password": "secreta123"
}
```

**Respuesta:**
```json
{
  "success": true,
  "message": "Autenticación exitosa",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "tokenType": "Bearer",
    "expiresIn": 86400,
    "user": {
      "id": "uuid",
      "name": "Juan Pérez",
      "email": "correo@ejemplo.com",
      "role": "operator"
    }
  }
}
```

**Importante:** Guarda el `token`. Lo usarás en el header `Authorization: Bearer <token>` para el endpoint del dashboard.

---

### POST `/api/v1/biometric-enroll`
Enrolar un dispositivo para login biométrico.

**Body (JSON):**
```json
{
  "userId": "uuid-del-usuario",
  "publicKey": "clave-publica-base64"
}
```

**Respuesta:**
```json
{
  "success": true,
  "message": "Dispositivo móvil enrolado exitosamente para acceso biométrico."
}
```

---

### POST `/api/v1/biometric-login`
Iniciar sesión con biometría (WebAuthn-style). Requiere haber enrolado el dispositivo antes.

**Body (JSON):**
```json
{
  "userId": "uuid-del-usuario",
  "challenge": "reto-aleatorio",
  "signature": "firma-digital"
}
```

**Respuesta:** misma estructura que login normal (devuelve token JWT).

---

## 2. Sucursales (Branches)

### GET `/api/v1/branches`
Listar todas las sucursales. **Sin autenticación.**

```json
[
  {
    "id": "uuid",
    "name": "Sucursal Centro",
    "address": "Av. Principal 123",
    "motorcycleCapacity": 100,
    "lightVehicleCapacity": 300,
    "heavyVehicleCapacity": 50,
    "motorcycleRate": 2.50,
    "lightVehicleRate": 5.00,
    "heavyVehicleRate": 12.00,
    "currency": "USD",
    "createdAt": "2026-05-22T...",
    "updatedAt": "2026-05-22T..."
  }
]
```

Usa este endpoint para poblar el selector de sucursales. El `id` de cada sucursal se usa en los demás endpoints.

---

### GET `/api/v1/branches/:id`
Obtener una sucursal por ID.

**Parámetro:** `id` (UUID de la sucursal)

---

### POST `/api/v1/branches`
Crear una nueva sucursal. Los campos ahora se validan automáticamente (`@IsString`, `@Min(0)`, etc.).

**Body (JSON):**
```json
{
  "name": "Sucursal Norte",
  "address": "Calle 456",
  "motorcycleCapacity": 80,
  "lightVehicleCapacity": 200,
  "heavyVehicleCapacity": 30,
  "motorcycleRate": 2.00,
  "lightVehicleRate": 4.50,
  "heavyVehicleRate": 10.00,
  "currency": "USD"
}
```
Todos los campos numéricos tienen default 0, `currency` default "USD". `currency` solo acepta `USD`, `MXN` o `EUR`.

---

### PATCH `/api/v1/branches/:id`
Actualizar datos de una sucursal. Mismos campos que create pero todos opcionales.

---

### DELETE `/api/v1/branches/:id`
Eliminar una sucursal. Retorna 204 No Content.

---

## 3. Ingresos y Salidas de Vehículos

### POST `/api/v1/vehicle-entries`
Registrar la entrada de un vehículo al estacionamiento.

**Tipo:** `multipart/form-data` (text fields + archivos)

| Campo | Tipo | Requerido | Descripción |
|-------|------|:---------:|-------------|
| `plate` | string | ✅ | Placa del vehículo |
| `vehicleType` | string | ✅ | `"motorcycle"`, `"light"` o `"heavy"` |
| `branchId` | string | ✅ | UUID de la sucursal |
| `isVip` | string | ❌ | `"true"` para marcar vehículo VIP |
| `platePhoto` | file | ✅ | Foto de la placa (máx 10 MB) |
| `front` | file | ❌ | Foto frontal |
| `rear` | file | ❌ | Foto trasera |
| `left` | file | ❌ | Foto lateral izquierda |
| `right` | file | ❌ | Foto lateral derecha |

**Respuesta:**
```json
{
  "success": true,
  "message": "Ingreso registrado exitosamente en SmartPark Server",
  "data": {
    "id": "uuid",
    "plate": "ABC-123",
    "vehicleType": "light",
    "isVip": false,
    "branchId": "uuid-de-sucursal",
    "platePhotoUrl": "uploads/vehicle-entries/abc123.jpg",
    "frontPhotoUrl": null,
    "rearPhotoUrl": null,
    "leftPhotoUrl": null,
    "rightPhotoUrl": null,
    "exitedAt": null,
    "createdAt": "2026-05-22T10:30:00.000Z",
    "branch": { ... }
  }
}
```

**Notas:**
- Las fotos se sirven estáticamente en: `http://192.168.2.112:3000/uploads/vehicle-entries/<archivo>`
- `isVip` se usa para poblar `vipArrivals` en el dashboard.
- Los `vehicleType` válidos son `motorcycle`, `light`, `heavy`.

---

### PATCH `/api/v1/vehicle-entries/:id/exit`
Registrar la salida de un vehículo. El vehículo debe haber ingresado antes y no haber salido aún.

**Body (JSON) — opcional:**
```json
{
  "exitedAt": "2026-05-22T18:30:00.000Z"
}
```
Si no se envía `exitedAt`, se usa la fecha/hora actual del servidor.

**Respuesta:**
```json
{
  "success": true,
  "message": "Salida registrada exitosamente",
  "data": {
    "id": "uuid",
    "plate": "ABC-123",
    "exitedAt": "2026-05-22T18:30:00.000Z",
    ...
  }
}
```

---

### GET `/api/v1/vehicle-entries`
Listar ingresos/egresos con filtros y paginación.

| Query param | Ejemplo | Descripción |
|-------------|---------|-------------|
| `branchId` | `?branchId=uuid` | Filtrar por sucursal |
| `exited` | `?exited=true` | `true` → solo salidas, `false` → solo activos (sin salir) |
| `from` | `?from=2026-05-22T00:00:00Z` | Fecha inicial del rango de ingreso |
| `to` | `?to=2026-05-22T23:59:59Z` | Fecha final del rango de ingreso |
| `page` | `?page=1` | Número de página |
| `limit` | `?limit=20` | Resultados por página |

**Respuesta:**
```json
{
  "data": [
    {
      "id": "uuid",
      "plate": "ABC-123",
      "vehicleType": "light",
      "isVip": false,
      "branchId": "uuid",
      "platePhotoUrl": "uploads/...",
      "exitedAt": "2026-05-22T18:30:00.000Z",
      "createdAt": "2026-05-22T10:30:00.000Z",
      "branch": { "id": "uuid", "name": "Sucursal Centro", ... }
    }
  ],
  "meta": {
    "total": 150,
    "page": 1,
    "limit": 20,
    "totalPages": 8
  }
}
```

**Para el Historial de Salidas** usa: `?exited=true&branchId=<id>`

---

### GET `/api/v1/vehicle-entries/:id`
Obtener detalle de un ingreso/salida específico.

**Respuesta:** Objeto completo del vehicle entry (incluye `branch`).

---

## 4. Dashboard (requiere autenticación)

### GET `/api/v1/branches/:branchId/dashboard`
Obtener métricas en tiempo real de una sucursal.

**Header requerido:**
```
Authorization: Bearer <token>
```

**Parámetro:** `branchId` (UUID de la sucursal)

**Respuesta:**
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
    {
      "memberName": "Juan Pérez",
      "tier": "Elite",
      "timeLeft": "14m"
    }
  ],
  "vipArrivals": [
    {
      "guestName": "ABC-123",
      "slot": "VIP-1"
    }
  ]
}
```

| Campo | Tipo | Cómo se calcula |
|-------|------|-----------------|
| `occupancyPercent` | number (0–100) | (Vehículos actualmente dentro / Capacidad total equivalente) × 100. Solo cuenta entradas **sin salir**. |
| `occupiedBays` | number | Espacios equivalentes ocupados **ahora** (exitedAt = null). |
| `totalBays` | number | Capacidad total en equivalentes: `motorcycleCapacity + lightVehicleCapacity + (heavyVehicleCapacity × 3)` |
| `trendPercent` | number | % de cambio vs ayer a la misma hora. |
| `dailyRevenue` | number | Suma de (cantidad de cada tipo × su tarifa) para ingresos de **hoy**. |
| `activeMemberships` | number | Membresías activas de esta sucursal. |
| `totalMemberships` | number | Total de membresías (activas + inactivas). |
| `criticalAlertsCount` | number | Membresías activas que vencen en las próximas 24 horas. |
| `expiringMemberships` | array | Lista de membresías próximas a vencer con `memberName`, `tier` y `timeLeft` (`"14m"`, `"2h 30m"`). |
| `vipArrivals` | array | Vehículos marcados como `isVip: true` que ingresaron en la última hora **y no han salido**. |

---

## 5. Membresías

### POST `/api/v1/memberships`
Crear una nueva membresía.

**Body (JSON):**
```json
{
  "memberName": "Juan Pérez",
  "tier": "Elite",
  "startDate": "2026-05-22T00:00:00Z",
  "endDate": "2026-05-23T00:00:00Z",
  "isActive": true,
  "branchId": "uuid-de-sucursal"
}
```
`tier` puede ser `"Regular"`, `"Premium"` o `"Elite"` (default `"Regular"`).

---

### GET `/api/v1/memberships`
Listar membresías. Opcionalmente filtrar por sucursal:

`GET /api/v1/memberships?branchId=uuid`

---

### GET `/api/v1/memberships/:id`
Obtener detalle de una membresía.

---

### PATCH `/api/v1/memberships/:id`
Actualizar una membresía. Mismos campos que create pero todos opcionales.

---

### DELETE `/api/v1/memberships/:id`
Eliminar una membresía. Retorna 204 No Content.

---

## 📐 Reglas de Negocio

| Regla | Detalle |
|-------|---------|
| **1 heavy = 3 light** | Un camión pesado ocupa el equivalente a 3 espacios livianos. Afecta `occupancyPercent`, `occupiedBays` y `totalBays`. |
| **Ocupación** | Solo cuentan vehículos **sin salir** (`exitedAt = null`). |
| **Ingresos** | Solo se considera el día actual (desde las 00:00 hs). No es acumulado histórico. |
| **Alertas críticas** | Membresías con menos de 24 horas para vencer. |
| **VIP arrivals** | Vehículos con `isVip: true` que ingresaron en la última hora y no han salido. |
| **Fotos** | Máximo 10 MB por archivo. Se sirven estáticamente en `/uploads/vehicle-entries/`. |

---

## 🔐 Sobre la Autenticación

Solo el endpoint del dashboard requiere JWT. Los demás endpoints son públicos.

Flujo recomendado para la app:
1. Login → obtienes `token`
2. Guardas el token en `SessionManager`
3. Para el dashboard: `Authorization: Bearer <token>`
4. El token expira en 24h (`expiresIn: 86400`)

---

## 🌐 CORS

El servidor acepta peticiones desde cualquier origen con métodos `GET`, `POST`, `PATCH`, `DELETE` y headers `Content-Type`, `Authorization`.

---

## ✅ Validación de Datos

Todos los endpoints con `POST`/`PATCH` validan los campos automáticamente. Si envías un campo inválido o faltante, recibirás un error 400 con los detalles.

---

## 🧪 Datos de Prueba

```sql
INSERT INTO "Membership" (id, "memberName", tier, "startDate", "endDate", "isActive", "branchId")
VALUES 
  (gen_random_uuid(), 'Juan Pérez', 'Elite',  NOW(), NOW() + interval '1 hour', true, '<branch-id>'),
  (gen_random_uuid(), 'María García', 'Premium', NOW(), NOW() + interval '30 minutes', true, '<branch-id>');
```

Marca un vehículo como VIP al crearlo con `isVip: "true"` en el form data.

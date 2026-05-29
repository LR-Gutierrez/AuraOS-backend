# SmartPark OS — Backend

API REST para el sistema de estacionamiento SmartPark OS.  
Construido con [NestJS](https://nestjs.com/), PostgreSQL y Prisma.

## Requisitos

- Node.js >= 18
- PostgreSQL >= 14
- npm

## Setup

```bash
npm install
cp .env.example .env   # configurar DATABASE_URL
npx prisma migrate dev
npm run seed
```

## Desarrollo

```bash
npm run start:dev
```

Servidor en `http://localhost:3000`.

## Documentación de API

➡️ [resumen-frontend.md](./resumen-frontend.md)

## Seed

```bash
npm run seed
```

Crea un usuario `luisangelrgr@gmail.com` / `123456` y una sucursal predeterminada.

## Stack

| Capa | Tecnología |
|------|-----------|
| Framework | NestJS 11 |
| ORM | Prisma 7 |
| DB | PostgreSQL |
| Auth | JWT (passport) + bcrypt |
| Validación | class-validator |
| Archivos | Multer (disk storage) |

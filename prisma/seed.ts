import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  let branch = await prisma.branch.findFirst();
  if (!branch) {
    throw new Error('No hay ninguna sucursal en la BD. Ejecuta las migrations primero.');
  }

  branch = await prisma.branch.update({
    where: { id: branch.id },
    data: {
      name: 'SmartPark Centro',
      address: 'Av. Principal 123, Centro',
      motorcycleCapacity: 20,
      lightVehicleCapacity: 50,
      heavyVehicleCapacity: 20,
      motorcycleRate: 3,
      lightVehicleRate: 5,
      heavyVehicleRate: 7,
      motorcycleOvernightRate: 5,
      lightVehicleOvernightRate: 10,
      heavyVehicleOvernightRate: 15.0,
      openTimeWeekday: '07:00',
      closeTimeWeekday: '23:00',
      openTimeWeekend: '09:00',
      closeTimeWeekend: '22:00',
      currency: 'USD',
      favorite: true,
    },
  });

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash('123456', salt);

  const user1 = await prisma.user.upsert({
    where: { email: 'luisangelrgr@gmail.com' },
    update: {},
    create: {
      email: 'luisangelrgr@gmail.com',
      password: hashedPassword,
      name: 'Luis Angel',
      role: 'admin',
    },
  });

  const hashedPasswordAdmin = await bcrypt.hash('admin123', salt);

  const user2 = await prisma.user.upsert({
    where: { email: 'admin@smartpark.com' },
    update: {},
    create: {
      email: 'admin@smartpark.com',
      password: hashedPasswordAdmin,
      name: 'Administrador',
      role: 'admin',
    },
  });

  const vehicleEntries = await Promise.all([
    prisma.vehicleEntry.create({
      data: {
        plate: 'ABC-1234',
        vehicleType: 'light',
        isVip: false,
        branchId: branch.id,
        createdAt: new Date('2026-05-31T12:00:00Z'),
      },
    }),
    prisma.vehicleEntry.create({
      data: {
        plate: 'XYZ-7890',
        vehicleType: 'heavy',
        isVip: false,
        branchId: branch.id,
        createdAt: new Date('2026-05-31T13:30:00Z'),
      },
    }),
    prisma.vehicleEntry.create({
      data: {
        plate: 'VIP-001',
        vehicleType: 'light',
        isVip: true,
        branchId: branch.id,
        createdAt: new Date('2026-05-31T11:00:00Z'),
      },
    }),
  ]);

  const oneMonthMs = 30 * 24 * 60 * 60 * 1000;
  const memberships = await Promise.all([
    prisma.membership.create({
      data: {
        memberName: 'Juan Pérez',
        tier: 'Elite',
        startDate: new Date(),
        endDate: new Date(Date.now() + oneMonthMs),
        isActive: true,
        branchId: branch.id,
      },
    }),
    prisma.membership.create({
      data: {
        memberName: 'María García',
        tier: 'Premium',
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 60 * 1000),
        isActive: true,
        branchId: branch.id,
      },
    }),
    prisma.membership.create({
      data: {
        memberName: 'Carlos López',
        tier: 'PREMIUM',
        startDate: new Date('2026-05-01'),
        endDate: new Date('2026-05-15'),
        isActive: false,
        branchId: branch.id,
      },
    }),
  ]);

  console.log('Seed completado:', {
    sucursal: branch.name,
    usuarios: [user1.email, user2.email],
    vehiculos: vehicleEntries.length,
    membresías: memberships.length,
  });
}

main()
  .catch((e) => {
    console.error('Error en seed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

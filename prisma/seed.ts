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

  if (!branch.favorite) {
    branch = await prisma.branch.update({
      where: { id: branch.id },
      data: { favorite: true },
    });
  }

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash('123456', salt);

  const user = await prisma.user.upsert({
    where: { email: 'luisangelrgr@gmail.com' },
    update: {},
    create: {
      email: 'luisangelrgr@gmail.com',
      password: hashedPassword,
      name: 'Luis Angel',
      role: 'admin',
    },
  });

  const memberships = await Promise.all([
    prisma.membership.upsert({
      where: { id: '00000000-0000-0000-0000-000000000002' },
      update: {},
      create: {
        id: '00000000-0000-0000-0000-000000000002',
        memberName: 'Juan Pérez',
        tier: 'Elite',
        startDate: new Date(),
        endDate: new Date(Date.now() + 60 * 60 * 1000),
        isActive: true,
        branchId: branch.id,
      },
    }),
    prisma.membership.upsert({
      where: { id: '00000000-0000-0000-0000-000000000003' },
      update: {},
      create: {
        id: '00000000-0000-0000-0000-000000000003',
        memberName: 'María García',
        tier: 'Premium',
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 60 * 1000),
        isActive: true,
        branchId: branch.id,
      },
    }),
  ]);

  console.log('Seed completado:', {
    sucursal: branch.name,
    usuario: user.email,
    membresías: memberships.length,
  });
}

main()
  .catch((e) => {
    console.error('Error en seed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

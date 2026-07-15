import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const shop = await prisma.shop.upsert({
    where: { slug: 'demo' },
    update: {},
    create: {
      name: 'Demo Nail & Hair Salon',
      slug: 'demo',
      shopType: 'MULTI',
      bahtPerPoint: 50,
    },
  });

  const passwordHash = await bcrypt.hash('admin1234', 10);
  const owner = await prisma.staffUser.upsert({
    where: { email: 'admin@possystem.local' },
    update: {},
    create: {
      shopId: shop.id,
      name: 'เจ้าของร้าน',
      email: 'admin@possystem.local',
      passwordHash,
      role: 'OWNER',
    },
  });

  console.log('Seeded shop:', shop.slug);
  console.log('Login with: admin@possystem.local / admin1234 (staff id:', owner.id, ')');

  const platformPasswordHash = await bcrypt.hash('platform1234', 10);
  const platformAdmin = await prisma.platformAdmin.upsert({
    where: { email: 'platform@possystem.local' },
    update: { isSuperAdmin: true },
    create: {
      name: 'Platform Admin',
      email: 'platform@possystem.local',
      passwordHash: platformPasswordHash,
      isSuperAdmin: true,
    },
  });

  console.log('Login with: platform@possystem.local / platform1234 (platform admin id:', platformAdmin.id, ')');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

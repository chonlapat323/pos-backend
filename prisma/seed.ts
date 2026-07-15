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

  // --- Shop-scoped roles (example custom roles for staff) ---
  const managerRole = await prisma.role.upsert({
    where: { shopId_name: { shopId: shop.id, name: 'ผู้จัดการร้าน' } },
    update: {
      permissions: [
        'shop.categories.manage',
        'shop.services.manage',
        'shop.members.manage',
        'shop.rewards.manage',
        'shop.staff.manage',
        'shop.reports.view',
      ],
    },
    create: {
      shopId: shop.id,
      scope: 'SHOP',
      name: 'ผู้จัดการร้าน',
      permissions: [
        'shop.categories.manage',
        'shop.services.manage',
        'shop.members.manage',
        'shop.rewards.manage',
        'shop.staff.manage',
        'shop.reports.view',
      ],
    },
  });

  const cashierRole = await prisma.role.upsert({
    where: { shopId_name: { shopId: shop.id, name: 'พนักงานแคชเชียร์' } },
    update: { permissions: ['shop.members.manage', 'shop.rewards.manage'] },
    create: {
      shopId: shop.id,
      scope: 'SHOP',
      name: 'พนักงานแคชเชียร์',
      permissions: ['shop.members.manage', 'shop.rewards.manage'],
    },
  });

  const cashierPasswordHash = await bcrypt.hash('cashier1234', 10);
  const cashier = await prisma.staffUser.upsert({
    where: { email: 'cashier@possystem.local' },
    update: { roleId: cashierRole.id },
    create: {
      shopId: shop.id,
      name: 'พนักงานแคชเชียร์ (ทดสอบ)',
      email: 'cashier@possystem.local',
      passwordHash: cashierPasswordHash,
      role: 'STAFF',
      roleId: cashierRole.id,
    },
  });

  console.log('Seeded shop roles:', managerRole.name, '/', cashierRole.name);
  console.log(
    'Login with: cashier@possystem.local / cashier1234 (staff id:',
    cashier.id,
    ', role:',
    cashierRole.name,
    ')',
  );

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

  // --- Platform-scoped roles (example custom roles for platform admins) ---
  // Role's compound unique key (shopId, name) can't be queried via upsert when
  // shopId is null (Prisma's WhereUniqueInput type rejects a literal null there),
  // so platform-scoped roles use a plain find-then-create/update instead.
  async function upsertPlatformRole(name: string, permissions: string[]) {
    const existing = await prisma.role.findFirst({
      where: { scope: 'PLATFORM', shopId: null, name },
    });
    if (existing) {
      return prisma.role.update({ where: { id: existing.id }, data: { permissions } });
    }
    return prisma.role.create({ data: { scope: 'PLATFORM', name, permissions } });
  }

  const shopManagerRole = await upsertPlatformRole('ผู้จัดการร้านค้า', [
    'platform.shops.manage',
    'platform.dashboard.view',
  ]);

  const supportRole = await upsertPlatformRole('ผู้ดูแลฝ่ายสนับสนุน', [
    'platform.members.manage',
    'platform.staff.manage',
    'platform.dashboard.view',
  ]);

  const supportPasswordHash = await bcrypt.hash('support1234', 10);
  const supportAdmin = await prisma.platformAdmin.upsert({
    where: { email: 'support@possystem.local' },
    update: { roleId: supportRole.id, isSuperAdmin: false },
    create: {
      name: 'ฝ่ายสนับสนุน (ทดสอบ)',
      email: 'support@possystem.local',
      passwordHash: supportPasswordHash,
      roleId: supportRole.id,
      isSuperAdmin: false,
    },
  });

  console.log('Seeded platform roles:', shopManagerRole.name, '/', supportRole.name);
  console.log(
    'Login with: support@possystem.local / support1234 (platform admin id:',
    supportAdmin.id,
    ', role:',
    supportRole.name,
    ')',
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

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
  console.log(
    'Login with: admin@possystem.local / admin1234 (staff id:',
    owner.id,
    ')',
  );

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

  console.log(
    'Login with: platform@possystem.local / platform1234 (platform admin id:',
    platformAdmin.id,
    ')',
  );

  // --- Platform-scoped roles (example custom roles for platform admins) ---
  // Role's compound unique key (shopId, name) can't be queried via upsert when
  // shopId is null (Prisma's WhereUniqueInput type rejects a literal null there),
  // so platform-scoped roles use a plain find-then-create/update instead.
  async function upsertPlatformRole(name: string, permissions: string[]) {
    const existing = await prisma.role.findFirst({
      where: { scope: 'PLATFORM', shopId: null, name },
    });
    if (existing) {
      return prisma.role.update({
        where: { id: existing.id },
        data: { permissions },
      });
    }
    return prisma.role.create({
      data: { scope: 'PLATFORM', name, permissions },
    });
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

  console.log(
    'Seeded platform roles:',
    shopManagerRole.name,
    '/',
    supportRole.name,
  );
  console.log(
    'Login with: support@possystem.local / support1234 (platform admin id:',
    supportAdmin.id,
    ', role:',
    supportRole.name,
    ')',
  );

  // --- Service categories + services (demo catalog for the POS screen) ---
  // ServiceCategory/Service have no unique key besides id, so upsert-by-name via find-then-create/update,
  // same pattern as the platform roles above.

  // No real photos exist for demo data, and shops won't always have uploaded one for every
  // service/category either - rather than leaving imageUrl null (client renders a computed CSS
  // placeholder) or pointing at a third-party image service (network dependency, wrong for a
  // kiosk), generate a small labeled SVG and store it inline as a data: URI - a real, self-contained
  // "photo" that lives in our own data, no filesystem/network involved.
  function hueFromId(id: string): number {
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
      hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
    }
    return hash % 360;
  }

  function escapeXml(text: string): string {
    return text.replace(
      /[&<>"']/g,
      (c) =>
        ({
          '&': '&amp;',
          '<': '&lt;',
          '>': '&gt;',
          '"': '&quot;',
          "'": '&apos;',
        })[c] as string,
    );
  }

  function placeholderImage(
    seed: string,
    label: string,
    width: number,
    height: number,
  ): string {
    const hue = hueFromId(seed);
    const fontSize = Math.round(width / 13);
    const svg =
      `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">` +
      `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">` +
      `<stop offset="0%" stop-color="hsl(${hue}, 45%, 34%)"/>` +
      `<stop offset="100%" stop-color="hsl(${hue}, 40%, 20%)"/>` +
      `</linearGradient></defs>` +
      `<rect width="100%" height="100%" fill="url(#g)"/>` +
      `<text x="50%" y="50%" font-family="sans-serif" font-size="${fontSize}" font-weight="600" ` +
      `fill="rgba(255,255,255,0.55)" text-anchor="middle" dominant-baseline="central">${escapeXml(label)}</text>` +
      `</svg>`;
    return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
  }

  async function upsertCategory(name: string, sortOrder: number) {
    const imageUrl = placeholderImage(name, name, 240, 240);
    const existing = await prisma.serviceCategory.findFirst({
      where: { shopId: shop.id, name },
    });
    if (existing) {
      return prisma.serviceCategory.update({
        where: { id: existing.id },
        data: { sortOrder, imageUrl },
      });
    }
    return prisma.serviceCategory.create({
      data: { shopId: shop.id, name, sortOrder, imageUrl },
    });
  }

  async function upsertService(
    categoryId: string,
    name: string,
    data: {
      price: number;
      durationMinutes: number;
      description?: string;
      status?: 'ACTIVE' | 'INACTIVE' | 'PROMOTION';
    },
  ) {
    const existing = await prisma.service.findFirst({
      where: { shopId: shop.id, categoryId, name },
    });
    const payload = {
      shopId: shop.id,
      categoryId,
      name,
      price: data.price,
      durationMinutes: data.durationMinutes,
      description: data.description,
      status: data.status ?? 'ACTIVE',
      imageUrl: placeholderImage(`${categoryId}:${name}`, name, 480, 270),
    };
    if (existing) {
      return prisma.service.update({
        where: { id: existing.id },
        data: payload,
      });
    }
    return prisma.service.create({ data: payload });
  }

  const nailCategory = await upsertCategory('ทำเล็บ', 1);
  const hairCategory = await upsertCategory('ทำผม', 2);
  const waxCategory = await upsertCategory('แว็กซ์', 3);

  await upsertService(nailCategory.id, 'เจลสีเรียบ', {
    price: 350,
    durationMinutes: 45,
    description: 'ทาเจลสีเรียบทั้งมือ พร้อมตะไบและเล็มหนัง',
  });
  await upsertService(nailCategory.id, 'เจลเพ้นท์ลาย', {
    price: 550,
    durationMinutes: 60,
    description: 'เพ้นท์ลายตามแบบ พร้อมเจลสีพื้น',
    status: 'PROMOTION',
  });
  await upsertService(nailCategory.id, 'ต่อเล็บอะคริลิค', {
    price: 650,
    durationMinutes: 90,
    description: 'ต่อเล็บอะคริลิคทรงตามต้องการ',
  });
  await upsertService(nailCategory.id, 'ทำเล็บเท้า', {
    price: 400,
    durationMinutes: 45,
  });
  await upsertService(nailCategory.id, 'ต่อเล็บพลาสวูด (เลิกให้บริการ)', {
    price: 300,
    durationMinutes: 60,
    status: 'INACTIVE',
  });

  await upsertService(hairCategory.id, 'สระ + ไดร์', {
    price: 250,
    durationMinutes: 30,
  });
  await upsertService(hairCategory.id, 'ตัดผม', {
    price: 300,
    durationMinutes: 45,
  });
  await upsertService(hairCategory.id, 'ทำสีผม', {
    price: 1200,
    durationMinutes: 120,
    description: 'รวมยาสระและทรีทเมนต์บำรุงสี',
  });
  await upsertService(hairCategory.id, 'ยืดผม', {
    price: 1500,
    durationMinutes: 150,
    description: 'ยืดผมด้วยเคราติน ผมตรงลื่นเงางาม',
    status: 'PROMOTION',
  });

  await upsertService(waxCategory.id, 'แว็กซ์รักแร้', {
    price: 200,
    durationMinutes: 20,
  });
  await upsertService(waxCategory.id, 'แว็กซ์ขา', {
    price: 450,
    durationMinutes: 40,
  });
  await upsertService(waxCategory.id, 'แว็กซ์คิ้ว', {
    price: 150,
    durationMinutes: 15,
  });

  console.log(
    'Seeded categories:',
    nailCategory.name,
    '/',
    hairCategory.name,
    '/',
    waxCategory.name,
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

# Step: Clone → รันจริง (backend)

## 0. สิ่งที่ต้องมีก่อน
- Node.js (เวอร์ชันเดียวกับตอน dev)
- Docker + Docker Compose (สำหรับรัน PostgreSQL ของโปรเจกต์นี้เอง)
- PM2 (`npm install -g pm2`) ถ้ายังไม่มี

**เครื่องนี้มีโปรเจกต์อื่นรันอยู่ก่อนแล้ว (เช่น beautyup, line)** — เช็ค `docker ps` ก่อนเสมอว่า port ไหนถูกใช้ไปแล้วบ้าง ห้ามไปใช้ port หรือ database ร่วมกับโปรเจกต์อื่นเด็ดขาด โปรเจกต์นี้ตั้งใจแยก PostgreSQL เป็น container ของตัวเอง (port **5434**) ไม่ยุ่งกับ container ของโปรเจกต์อื่นเลย

## 1. Clone + ติดตั้ง
```
git clone <repo-url> pos-backend
cd pos-backend
npm install
npx prisma generate
```
`npm install` แค่ติดตั้ง package เปล่าๆ ของ `@prisma/client` — ต้องรัน `prisma generate` เพิ่มเพื่อสร้างโค้ด client จริงตาม schema ก่อน ไม่งั้น build/seed จะพังด้วย error แบบ "has no exported member 'PrismaClient'"

**หมายเหตุ**: ถ้าเครื่องนี้ใช้แค่ `docker-compose` (มีขีดกลาง, ตัวเก่า) แทน `docker compose` (เว้นวรรค) ให้เปลี่ยนทุกคำสั่ง `docker compose` ในไฟล์นี้เป็น `docker-compose` แทน

## 2. ตั้งค่า Database
```
docker compose up -d
```
จะได้ container `pos_services_postgres` รันอยู่ที่ port 5434 (แยกจากของโปรเจกต์อื่นทั้งหมด) เช็คว่าขึ้นจริงด้วย:
```
docker ps --format "table {{.Names}}\t{{.Ports}}"
```

## 3. ตั้งค่า `.env`
คัดลอก `.env` ที่มีอยู่ (หรือสร้างใหม่) แล้วใส่ค่าจริงให้ครบ **ห้ามใช้ค่าตัวอย่าง/dev ตอน deploy จริงเด็ดขาด**:
```
DATABASE_URL="postgresql://postgres:postgres@localhost:5434/pos_services?schema=public"
PORT=3010
CORS_ORIGINS="https://pos-admin.beautyup-enterprise.com,https://pos-sales.beautyup-enterprise.com"
BACKEND_PUBLIC_URL="https://pos-api.beautyup-enterprise.com"
JWT_SECRET="<สุ่มค่าใหม่ ยาวๆ>"
JWT_EXPIRES_IN="7d"
PLATFORM_JWT_SECRET="<สุ่มค่าใหม่ ยาวๆ>"
PLATFORM_JWT_EXPIRES_IN="7d"
CUSTOMER_JWT_SECRET="<สุ่มค่าใหม่ ยาวๆ>"
CUSTOMER_JWT_EXPIRES_IN="30d"
OMISE_PUBLIC_KEY="<คีย์จริงจาก Omise dashboard>"
OMISE_SECRET_KEY="<คีย์จริงจาก Omise dashboard>"
```

## 4. รัน Migration + Seed
```
npx prisma migrate deploy
npm run prisma:seed
```
- `migrate deploy` ใช้สำหรับ production เท่านั้น (ไม่สร้าง migration ใหม่ แค่ apply ที่มีอยู่แล้ว)
- `prisma:seed` จะสร้างแพ็กเกจ subscription (ทดลองใช้ฟรี/6 เดือน/1 ปี) และ **บัญชีทดสอบที่ใช้รหัสผ่านตายตัว** (`admin1234`, `cashier1234`, `platform1234`, `support1234`) — **ต้องเปลี่ยนรหัสผ่านบัญชี platform admin (`platform@possystem.local`) ทันทีหลัง deploy จริง** ก่อนเปิดให้ใช้งานจริง ไม่งั้นใครก็เข้าระบบ platform admin ได้

## 5. Build
```
npm run build
```

## 6. รันด้วย PM2
เปิด `ecosystem.config.js` แก้ค่า `CHANGE_ME` ทุกจุดให้เป็นค่าจริงตาม `.env` ข้อ 3 ก่อน แล้ว:
```
pm2 start ecosystem.config.js
pm2 save
```
เช็ค log: `pm2 logs pos-api`

## 7. ต่อ reverse proxy (Caddy)
เพิ่มใน Caddyfile:
```
pos-api.beautyup-enterprise.com {
    reverse_proxy localhost:3010
}
```
แล้ว reload Caddy (`caddy reload` หรือ `systemctl reload caddy` แล้วแต่วิธีที่ใช้อยู่)

## 8. ตรวจสอบ
```
curl https://pos-api.beautyup-enterprise.com/subscriptions/packages
```
ถ้าได้ JSON กลับมา (ไม่ error) แปลว่าใช้งานได้แล้ว

## หมายเหตุ
- โฟลเดอร์ `uploads/` (รูปโปรไฟล์/รูปก่อน-หลัง) ถูกสร้างอัตโนมัติตอนมีคนอัปโหลดครั้งแรก ไม่ต้องสร้างเองล่วงหน้า แต่ต้องแน่ใจว่า process ที่รัน backend มีสิทธิ์เขียนไฟล์ในโฟลเดอร์โปรเจกต์
- ถ้าจะรับชำระเงินจริง (ไม่ใช่ sandbox) ต้องเปลี่ยน `OMISE_PUBLIC_KEY`/`OMISE_SECRET_KEY` เป็นคีย์โหมด live จาก Omise dashboard ไม่ใช่คีย์ `_test_` แบบตอน dev

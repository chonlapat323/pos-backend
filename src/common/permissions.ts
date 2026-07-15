export const SHOP_PERMISSIONS = [
  { key: 'shop.categories.manage', label: 'จัดการกลุ่มบริการ' },
  { key: 'shop.services.manage', label: 'จัดการบริการ' },
  { key: 'shop.members.manage', label: 'จัดการสมาชิก' },
  { key: 'shop.rewards.manage', label: 'จัดการแลก Point / รางวัล' },
  { key: 'shop.staff.manage', label: 'จัดการพนักงาน' },
  { key: 'shop.settings.manage', label: 'จัดการตั้งค่าร้าน' },
  { key: 'shop.reports.view', label: 'ดูรายงาน' },
] as const;

export const PLATFORM_PERMISSIONS = [
  { key: 'platform.shops.manage', label: 'จัดการร้าน (สร้าง/แก้ไข/ระงับ)' },
  { key: 'platform.categories.manage', label: 'จัดการกลุ่มบริการ (ทุกร้าน)' },
  { key: 'platform.services.manage', label: 'จัดการบริการ (ทุกร้าน)' },
  { key: 'platform.members.manage', label: 'จัดการสมาชิก (ทุกร้าน)' },
  { key: 'platform.rewards.manage', label: 'จัดการแลก Point / รางวัล (ทุกร้าน)' },
  { key: 'platform.staff.manage', label: 'จัดการพนักงาน (ทุกร้าน)' },
  { key: 'platform.dashboard.view', label: 'ดูภาพรวมแพลตฟอร์ม' },
] as const;

export type ShopPermission = (typeof SHOP_PERMISSIONS)[number]['key'];
export type PlatformPermission = (typeof PLATFORM_PERMISSIONS)[number]['key'];

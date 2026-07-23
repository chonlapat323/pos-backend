import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

// Keys platform admins are allowed to view/edit through this module. Anything not listed here
// stays a plain env-only var, same as before this module existed.
export const EDITABLE_SETTING_KEYS = ['OMISE_PUBLIC_KEY'] as const;
export type EditableSettingKey = (typeof EDITABLE_SETTING_KEYS)[number];

@Injectable()
export class PlatformSettingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  // A row in the database always wins over the env var - that's what lets platform admins
  // override it without a redeploy. No row yet just means nobody has overridden the env default.
  async get(key: string): Promise<string | null> {
    const row = await this.prisma.platformSetting.findUnique({
      where: { key },
    });
    if (row) return row.value;
    return this.configService.get<string>(key) ?? null;
  }

  async getEditableSettings(): Promise<
    Record<EditableSettingKey, string | null>
  > {
    const entries = await Promise.all(
      EDITABLE_SETTING_KEYS.map(
        async (key) => [key, await this.get(key)] as const,
      ),
    );
    return Object.fromEntries(entries) as Record<
      EditableSettingKey,
      string | null
    >;
  }

  async set(key: string, value: string) {
    if (!EDITABLE_SETTING_KEYS.includes(key as EditableSettingKey)) {
      throw new NotFoundException('Unknown setting key');
    }
    return this.prisma.platformSetting.upsert({
      where: { key },
      create: { key, value },
      update: { value },
    });
  }
}

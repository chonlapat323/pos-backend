import { randomUUID } from 'node:crypto';
import { existsSync, mkdirSync } from 'node:fs';
import { extname, join } from 'node:path';
import {
  BadRequestException,
  Controller,
  NotFoundException,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Request } from 'express';
import { diskStorage } from 'multer';
import { PlatformJwtAuthGuard } from '../platform-auth/platform-jwt-auth.guard';
import { PrismaService } from '../prisma/prisma.service';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const SHOP_ID_PATTERN = /^[a-z0-9]+$/i;

function resolveShopId(req: Request): string {
  const shopId = req.query.shopId;
  if (typeof shopId !== 'string' || !SHOP_ID_PATTERN.test(shopId)) {
    throw new BadRequestException('Missing or invalid shopId');
  }
  return shopId;
}

@UseGuards(PlatformJwtAuthGuard)
@Controller('platform/uploads')
export class PlatformUploadsController {
  constructor(private readonly prisma: PrismaService) {}

  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (req, _file, cb) => {
          try {
            const dir = join(process.cwd(), 'uploads', resolveShopId(req as Request));
            if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
            cb(null, dir);
          } catch (error) {
            cb(error as Error, '');
          }
        },
        filename: (_req, file, cb) => {
          cb(null, `${randomUUID()}${extname(file.originalname)}`);
        },
      }),
      fileFilter: (_req, file, cb) => {
        if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
          cb(new BadRequestException('Only JPEG, PNG, or WEBP images are allowed'), false);
          return;
        }
        cb(null, true);
      },
      limits: { fileSize: MAX_FILE_SIZE },
    }),
  )
  async upload(@UploadedFile() file: Express.Multer.File, @Req() req: Request) {
    if (!file) throw new BadRequestException('No file uploaded');
    const shopId = resolveShopId(req);
    const shop = await this.prisma.shop.findUnique({ where: { id: shopId }, select: { id: true } });
    if (!shop) throw new NotFoundException('Shop not found');
    const baseUrl = process.env.BACKEND_PUBLIC_URL ?? 'http://localhost:3010';
    return { url: `${baseUrl}/uploads/${shopId}/${file.filename}` };
  }
}

import { randomUUID } from 'node:crypto';
import { existsSync, mkdirSync } from 'node:fs';
import { extname, join } from 'node:path';
import {
  BadRequestException,
  Controller,
  Post,
  Req,
  UnauthorizedException,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Request } from 'express';
import { diskStorage } from 'multer';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 5 * 1024 * 1024;

function resolveShopId(req: Request): string {
  const user = req.user as { shopId?: string } | undefined;
  if (!user?.shopId) throw new UnauthorizedException('Missing shop context');
  return user.shopId;
}

@UseGuards(JwtAuthGuard)
@Controller('uploads')
export class UploadsController {
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
  upload(@UploadedFile() file: Express.Multer.File, @Req() req: Request) {
    if (!file) throw new BadRequestException('No file uploaded');
    const shopId = resolveShopId(req);
    const baseUrl = process.env.BACKEND_PUBLIC_URL ?? 'http://localhost:3010';
    return { url: `${baseUrl}/uploads/${shopId}/${file.filename}` };
  }
}

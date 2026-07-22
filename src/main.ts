import { join } from 'node:path';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useStaticAssets(join(process.cwd(), 'uploads'), { prefix: '/uploads/' });

  const corsOrigins = (
    process.env.CORS_ORIGINS ??
    'http://localhost:3000,http://localhost:3011,http://localhost:3002'
  ).split(',');
  app.enableCors({ origin: corsOrigins });

  await app.listen(process.env.PORT ?? 3010);
}
bootstrap();

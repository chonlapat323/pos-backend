import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const corsOrigins = (
    process.env.CORS_ORIGINS ?? 'http://localhost:3000,http://localhost:3001,http://localhost:3002'
  ).split(',');
  app.enableCors({ origin: corsOrigins });

  await app.listen(process.env.PORT ?? 3010);
}
bootstrap();

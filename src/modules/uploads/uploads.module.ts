import { Module } from '@nestjs/common';
import { PlatformUploadsController } from './platform-uploads.controller';
import { UploadsController } from './uploads.controller';

@Module({
  controllers: [UploadsController, PlatformUploadsController],
})
export class UploadsModule {}

import { Module } from '@nestjs/common';
import { VisitPhotosController } from './visit-photos.controller';
import { VisitPhotosService } from './visit-photos.service';

@Module({
  controllers: [VisitPhotosController],
  providers: [VisitPhotosService],
})
export class VisitPhotosModule {}

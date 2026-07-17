import { Module } from '@nestjs/common';
import { CustomerCatalogController } from './customer-catalog.controller';
import { CustomerCatalogService } from './customer-catalog.service';

@Module({
  controllers: [CustomerCatalogController],
  providers: [CustomerCatalogService],
})
export class CustomerCatalogModule {}

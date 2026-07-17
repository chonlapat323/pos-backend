import { Controller, Get, Param, Query } from '@nestjs/common';
import { CustomerCatalogService } from './customer-catalog.service';

@Controller('customer-catalog')
export class CustomerCatalogController {
  constructor(
    private readonly customerCatalogService: CustomerCatalogService,
  ) {}

  @Get(':shopSlug/shop')
  getShop(@Param('shopSlug') shopSlug: string) {
    return this.customerCatalogService.getShop(shopSlug);
  }

  @Get(':shopSlug/categories')
  getCategories(@Param('shopSlug') shopSlug: string) {
    return this.customerCatalogService.getCategories(shopSlug);
  }

  @Get(':shopSlug/services')
  getServices(
    @Param('shopSlug') shopSlug: string,
    @Query('categoryId') categoryId?: string,
  ) {
    return this.customerCatalogService.getServices(shopSlug, categoryId);
  }
}

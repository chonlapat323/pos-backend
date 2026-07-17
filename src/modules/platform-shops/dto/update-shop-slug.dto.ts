import { Matches } from 'class-validator';

export class UpdateShopSlugDto {
  @Matches(/^[a-z0-9]+(-[a-z0-9]+)*$/, {
    message:
      'slug ต้องเป็นตัวพิมพ์เล็ก ตัวเลข และขีดกลางเท่านั้น (เช่น beautyup-siam)',
  })
  slug: string;
}

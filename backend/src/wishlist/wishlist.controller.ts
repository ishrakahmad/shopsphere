import { Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { WishlistService } from './wishlist.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Wishlist')
@ApiBearerAuth()
@Controller('wishlist')
export class WishlistController {
  constructor(private readonly wishlistService: WishlistService) {}

  @Get()
  @ApiOperation({ summary: 'Get my wishlist' })
  findAll(@CurrentUser() user: any) {
    return this.wishlistService.findAll(user.id);
  }

  @Post(':productId')
  @ApiOperation({ summary: 'Add a product to wishlist' })
  add(@CurrentUser() user: any, @Param('productId') productId: string) {
    return this.wishlistService.add(user.id, productId);
  }

  @Delete(':productId')
  @ApiOperation({ summary: 'Remove a product from wishlist' })
  remove(@CurrentUser() user: any, @Param('productId') productId: string) {
    return this.wishlistService.remove(user.id, productId);
  }
}

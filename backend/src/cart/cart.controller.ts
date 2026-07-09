import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { CartService } from './cart.service';
import { AddToCartDto, UpdateCartItemDto, ApplyCouponDto } from './dto/cart.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Cart')
@ApiBearerAuth()
@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  @ApiOperation({ summary: 'Get my cart with totals' })
  getCart(@CurrentUser() user: any) {
    return this.cartService.getCart(user.id);
  }

  @Post('items')
  @ApiOperation({ summary: 'Add a product to the cart' })
  addItem(@CurrentUser() user: any, @Body() dto: AddToCartDto) {
    return this.cartService.addItem(user.id, dto);
  }

  @Patch('items/:itemId')
  @ApiOperation({ summary: 'Update quantity of a cart item' })
  updateItem(@CurrentUser() user: any, @Param('itemId') itemId: string, @Body() dto: UpdateCartItemDto) {
    return this.cartService.updateItem(user.id, itemId, dto);
  }

  @Delete('items/:itemId')
  @ApiOperation({ summary: 'Remove an item from the cart' })
  removeItem(@CurrentUser() user: any, @Param('itemId') itemId: string) {
    return this.cartService.removeItem(user.id, itemId);
  }

  @Patch('items/:itemId/save-for-later')
  @ApiOperation({ summary: 'Move a cart item to Save for Later' })
  saveForLater(@CurrentUser() user: any, @Param('itemId') itemId: string) {
    return this.cartService.saveForLater(user.id, itemId);
  }

  @Patch('items/:itemId/move-to-cart')
  @ApiOperation({ summary: 'Move a saved item back to the cart' })
  moveToCart(@CurrentUser() user: any, @Param('itemId') itemId: string) {
    return this.cartService.moveToCart(user.id, itemId);
  }

  @Post('coupon')
  @ApiOperation({ summary: 'Apply a coupon code to the cart' })
  applyCoupon(@CurrentUser() user: any, @Body() dto: ApplyCouponDto) {
    return this.cartService.applyCoupon(user.id, dto.code);
  }

  @Delete('coupon')
  @ApiOperation({ summary: 'Remove the applied coupon' })
  removeCoupon(@CurrentUser() user: any) {
    return this.cartService.removeCoupon(user.id);
  }

  @Delete()
  @ApiOperation({ summary: 'Clear all items from the cart' })
  clearCart(@CurrentUser() user: any) {
    return this.cartService.clearCart(user.id);
  }
}

import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AddToCartDto, UpdateCartItemDto } from './dto/cart.dto';
import { validateCoupon } from '../common/utils/coupon';

const SHIPPING_FLAT_RATE = 5.99;
const FREE_SHIPPING_THRESHOLD = 75;

@Injectable()
export class CartService {
  constructor(private prisma: PrismaService) {}

  private async getOrCreateCart(userId: string) {
    let cart = await this.prisma.cart.findUnique({ where: { userId } });
    if (!cart) {
      cart = await this.prisma.cart.create({ data: { userId } });
    }
    return cart;
  }

  private async buildResponse(userId: string) {
    const cart = await this.getOrCreateCart(userId);
    const items = await this.prisma.cartItem.findMany({
      where: { cartId: cart.id, savedForLater: false },
      include: { product: { include: { category: true } } },
    });
    const savedForLater = await this.prisma.cartItem.findMany({
      where: { cartId: cart.id, savedForLater: true },
      include: { product: { include: { category: true } } },
    });

    const subtotal = items.reduce((sum, item) => {
      const price = Number(item.product.discountPrice ?? item.product.price);
      return sum + price * item.quantity;
    }, 0);

    let discount = 0;
    let couponMessage: string | undefined;
    if (cart.couponCode) {
      const result = validateCoupon(cart.couponCode, subtotal);
      discount = result.valid ? result.discount : 0;
      if (!result.valid) couponMessage = result.message;
    }

    const shipping = subtotal === 0 || subtotal - discount >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FLAT_RATE;
    const total = Math.max(subtotal - discount + shipping, 0);

    return {
      items,
      savedForLater,
      couponCode: cart.couponCode,
      couponMessage,
      subtotal: Number(subtotal.toFixed(2)),
      discount: Number(discount.toFixed(2)),
      shipping: Number(shipping.toFixed(2)),
      total: Number(total.toFixed(2)),
      freeShippingThreshold: FREE_SHIPPING_THRESHOLD,
    };
  }

  async getCart(userId: string) {
    return this.buildResponse(userId);
  }

  async addItem(userId: string, dto: AddToCartDto) {
    const product = await this.prisma.product.findUnique({ where: { id: dto.productId } });
    if (!product || !product.isActive) throw new NotFoundException('Product not found');

    const cart = await this.getOrCreateCart(userId);
    const quantity = dto.quantity ?? 1;

    const existing = await this.prisma.cartItem.findUnique({
      where: { cartId_productId: { cartId: cart.id, productId: dto.productId } },
    });

    const desiredQty = (existing?.quantity ?? 0) + quantity;
    if (desiredQty > product.stock) {
      throw new BadRequestException(`Only ${product.stock} unit(s) of "${product.name}" available in stock`);
    }

    if (existing) {
      await this.prisma.cartItem.update({
        where: { id: existing.id },
        data: { quantity: desiredQty, savedForLater: false },
      });
    } else {
      await this.prisma.cartItem.create({
        data: { cartId: cart.id, productId: dto.productId, quantity },
      });
    }

    return this.buildResponse(userId);
  }

  async updateItem(userId: string, itemId: string, dto: UpdateCartItemDto) {
    const cart = await this.getOrCreateCart(userId);
    const item = await this.prisma.cartItem.findFirst({ where: { id: itemId, cartId: cart.id }, include: { product: true } });
    if (!item) throw new NotFoundException('Cart item not found');

    if (dto.quantity > item.product.stock) {
      throw new BadRequestException(`Only ${item.product.stock} unit(s) available in stock`);
    }

    await this.prisma.cartItem.update({ where: { id: itemId }, data: { quantity: dto.quantity } });
    return this.buildResponse(userId);
  }

  async removeItem(userId: string, itemId: string) {
    const cart = await this.getOrCreateCart(userId);
    const item = await this.prisma.cartItem.findFirst({ where: { id: itemId, cartId: cart.id } });
    if (!item) throw new NotFoundException('Cart item not found');
    await this.prisma.cartItem.delete({ where: { id: itemId } });
    return this.buildResponse(userId);
  }

  async saveForLater(userId: string, itemId: string) {
    const cart = await this.getOrCreateCart(userId);
    const item = await this.prisma.cartItem.findFirst({ where: { id: itemId, cartId: cart.id } });
    if (!item) throw new NotFoundException('Cart item not found');
    await this.prisma.cartItem.update({ where: { id: itemId }, data: { savedForLater: true } });
    return this.buildResponse(userId);
  }

  async moveToCart(userId: string, itemId: string) {
    const cart = await this.getOrCreateCart(userId);
    const item = await this.prisma.cartItem.findFirst({ where: { id: itemId, cartId: cart.id } });
    if (!item) throw new NotFoundException('Saved item not found');
    await this.prisma.cartItem.update({ where: { id: itemId }, data: { savedForLater: false } });
    return this.buildResponse(userId);
  }

  async applyCoupon(userId: string, code: string) {
    const cart = await this.getOrCreateCart(userId);
    const items = await this.prisma.cartItem.findMany({
      where: { cartId: cart.id, savedForLater: false },
      include: { product: true },
    });
    const subtotal = items.reduce((sum, item) => sum + Number(item.product.discountPrice ?? item.product.price) * item.quantity, 0);

    const result = validateCoupon(code, subtotal);
    if (!result.valid) throw new BadRequestException(result.message || 'Invalid coupon');

    await this.prisma.cart.update({ where: { id: cart.id }, data: { couponCode: code.toUpperCase() } });
    return this.buildResponse(userId);
  }

  async removeCoupon(userId: string) {
    const cart = await this.getOrCreateCart(userId);
    await this.prisma.cart.update({ where: { id: cart.id }, data: { couponCode: null } });
    return this.buildResponse(userId);
  }

  async clearCart(userId: string) {
    const cart = await this.getOrCreateCart(userId);
    await this.prisma.cartItem.deleteMany({ where: { cartId: cart.id, savedForLater: false } });
    await this.prisma.cart.update({ where: { id: cart.id }, data: { couponCode: null } });
    return this.buildResponse(userId);
  }
}

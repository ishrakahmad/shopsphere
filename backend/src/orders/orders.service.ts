import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrderDto, UpdateOrderStatusDto } from './dto/order.dto';
import { validateCoupon } from '../common/utils/coupon';
import { PaginationDto } from '../common/dto/pagination.dto';
import { OrderStatus } from '@prisma/client';

const SHIPPING_FLAT_RATE = 5.99;
const FREE_SHIPPING_THRESHOLD = 75;

@Injectable()
export class OrdersService {
  constructor(private prisma: PrismaService) {}

  private generateOrderNumber() {
    const ts = Date.now().toString().slice(-8);
    const rand = Math.floor(1000 + Math.random() * 9000);
    return `ORD-${ts}${rand}`;
  }

  async checkout(userId: string, dto: CreateOrderDto) {
    // Verify addresses belong to the user
    const billing = await this.prisma.address.findUnique({ where: { id: dto.billingAddressId } });
    const shipping = await this.prisma.address.findUnique({ where: { id: dto.shippingAddressId } });
    if (!billing || billing.userId !== userId) throw new BadRequestException('Invalid billing address');
    if (!shipping || shipping.userId !== userId) throw new BadRequestException('Invalid shipping address');

    const cart = await this.prisma.cart.findUnique({ where: { userId } });
    if (!cart) throw new BadRequestException('Cart is empty');

    const items = await this.prisma.cartItem.findMany({
      where: { cartId: cart.id, savedForLater: false },
      include: { product: true },
    });
    if (items.length === 0) throw new BadRequestException('Cart is empty');

    // Validate stock for every item first
    for (const item of items) {
      if (item.quantity > item.product.stock) {
        throw new BadRequestException(`Insufficient stock for "${item.product.name}". Only ${item.product.stock} left.`);
      }
    }

    const subtotal = items.reduce((sum, item) => sum + Number(item.product.discountPrice ?? item.product.price) * item.quantity, 0);

    let discount = 0;
    if (cart.couponCode) {
      const result = validateCoupon(cart.couponCode, subtotal);
      if (result.valid) discount = result.discount;
    }

    const shippingFee = subtotal - discount >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FLAT_RATE;
    const total = Math.max(subtotal - discount + shippingFee, 0);

    const order = await this.prisma.$transaction(async (tx) => {
      const newOrder = await tx.order.create({
        data: {
          orderNumber: this.generateOrderNumber(),
          userId,
          billingAddressId: dto.billingAddressId,
          shippingAddressId: dto.shippingAddressId,
          subtotal,
          discount,
          shippingFee,
          total,
          couponCode: cart.couponCode,
          paymentMethod: dto.paymentMethod,
          status: OrderStatus.PENDING,
          items: {
            create: items.map((item) => ({
              productId: item.productId,
              name: item.product.name,
              price: item.product.discountPrice ?? item.product.price,
              quantity: item.quantity,
              image: item.product.images[0] ?? null,
            })),
          },
          payment: {
            create: {
              method: dto.paymentMethod,
              status: 'PENDING',
              amount: total,
            },
          },
        },
        include: { items: true, payment: true, billingAddress: true, shippingAddress: true },
      });

      // Decrement stock + bump totalSold
      for (const item of items) {
        await tx.product.update({
          where: { id: item.productId },
          data: {
            stock: { decrement: item.quantity },
            totalSold: { increment: item.quantity },
          },
        });
      }

      // Clear the cart
      await tx.cartItem.deleteMany({ where: { cartId: cart.id, savedForLater: false } });
      await tx.cart.update({ where: { id: cart.id }, data: { couponCode: null } });

      return newOrder;
    });

    return order;
  }

  async findMyOrders(userId: string, pagination: PaginationDto) {
    const { page = 1, limit = 10 } = pagination;
    const [orders, total] = await this.prisma.$transaction([
      this.prisma.order.findMany({
        where: { userId },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { items: true, payment: true },
      }),
      this.prisma.order.count({ where: { userId } }),
    ]);
    return { data: orders, meta: { total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / limit) } };
  }

  async findOne(userId: string, id: string, isAdmin = false) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        items: true,
        payment: true,
        billingAddress: true,
        shippingAddress: true,
        user: { select: { id: true, name: true, email: true, phone: true } },
      },
    });
    if (!order) throw new NotFoundException('Order not found');
    if (!isAdmin && order.userId !== userId) throw new ForbiddenException();
    return order;
  }

  async cancelOrder(userId: string, id: string) {
    const order = await this.findOne(userId, id);
    const cancellableStatuses: OrderStatus[] = [OrderStatus.PENDING, OrderStatus.PROCESSING];
if (!cancellableStatuses.includes(order.status)) {
      throw new BadRequestException('This order can no longer be cancelled');
    }

    return this.prisma.$transaction(async (tx) => {
      // Restock items
      for (const item of order.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { increment: item.quantity }, totalSold: { decrement: item.quantity } },
        });
      }
      return tx.order.update({ where: { id }, data: { status: OrderStatus.CANCELLED }, include: { items: true, payment: true } });
    });
  }

  // ---- Admin ----

  async adminFindAll(pagination: PaginationDto, status?: OrderStatus) {
    const { page = 1, limit = 15 } = pagination;
    const where = status ? { status } : {};
    const [orders, total] = await this.prisma.$transaction([
      this.prisma.order.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { items: true, payment: true, user: { select: { id: true, name: true, email: true } } },
      }),
      this.prisma.order.count({ where }),
    ]);
    return { data: orders, meta: { total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / limit) } };
  }

  async updateStatus(id: string, dto: UpdateOrderStatusDto) {
    const order = await this.prisma.order.findUnique({ where: { id } });
    if (!order) throw new NotFoundException('Order not found');

    const updated = await this.prisma.order.update({
      where: { id },
      data: { status: dto.status },
      include: { items: true, payment: true },
    });

    // If delivered + COD, mark payment as paid
    if (dto.status === OrderStatus.DELIVERED && order.paymentMethod === 'COD') {
      await this.prisma.payment.update({
        where: { orderId: id },
        data: { status: 'PAID', paidAt: new Date() },
      });
    }

    return updated;
  }
}

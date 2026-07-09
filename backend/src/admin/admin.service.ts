import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OrderStatus } from '@prisma/client';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  async dashboard() {
    const [totalOrders, totalCustomers, totalProducts, revenueAgg, pendingOrders, deliveredOrders, cancelledOrders] =
      await this.prisma.$transaction([
        this.prisma.order.count(),
        this.prisma.user.count({ where: { role: 'CUSTOMER' } }),
        this.prisma.product.count({ where: { isActive: true } }),
        this.prisma.order.aggregate({
          _sum: { total: true },
          where: { status: { not: OrderStatus.CANCELLED } },
        }),
        this.prisma.order.count({ where: { status: OrderStatus.PENDING } }),
        this.prisma.order.count({ where: { status: OrderStatus.DELIVERED } }),
        this.prisma.order.count({ where: { status: OrderStatus.CANCELLED } }),
      ]);

    return {
      totalOrders,
      totalCustomers,
      totalProducts,
      totalRevenue: Number(revenueAgg._sum.total ?? 0),
      pendingOrders,
      deliveredOrders,
      cancelledOrders,
    };
  }

  async monthlySales(months = 6) {
    const since = new Date();
    since.setMonth(since.getMonth() - (months - 1));
    since.setDate(1);
    since.setHours(0, 0, 0, 0);

    const orders = await this.prisma.order.findMany({
      where: { createdAt: { gte: since }, status: { not: OrderStatus.CANCELLED } },
      select: { createdAt: true, total: true },
    });

    const buckets = new Map<string, { month: string; revenue: number; orders: number }>();
    for (let i = 0; i < months; i++) {
      const d = new Date(since);
      d.setMonth(d.getMonth() + i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      buckets.set(key, { month: key, revenue: 0, orders: 0 });
    }

    for (const order of orders) {
      const key = `${order.createdAt.getFullYear()}-${String(order.createdAt.getMonth() + 1).padStart(2, '0')}`;
      const bucket = buckets.get(key);
      if (bucket) {
        bucket.revenue += Number(order.total);
        bucket.orders += 1;
      }
    }

    return Array.from(buckets.values());
  }

  async topProducts(limit = 10) {
    return this.prisma.product.findMany({
      where: { isActive: true },
      orderBy: { totalSold: 'desc' },
      take: limit,
      select: {
        id: true,
        name: true,
        images: true,
        price: true,
        totalSold: true,
        avgRating: true,
        stock: true,
      },
    });
  }

  async lowStockProducts(threshold = 10) {
    return this.prisma.product.findMany({
      where: { isActive: true, stock: { lte: threshold } },
      orderBy: { stock: 'asc' },
      select: { id: true, name: true, stock: true, sku: true, images: true },
    });
  }

  async revenueByCategory() {
    const items = await this.prisma.orderItem.findMany({
      where: { order: { status: { not: OrderStatus.CANCELLED } } },
      include: { product: { include: { category: true } } },
    });

    const map = new Map<string, { category: string; revenue: number }>();
    for (const item of items) {
      const categoryName = item.product?.category?.name ?? 'Unknown';
      const revenue = Number(item.price) * item.quantity;
      const existing = map.get(categoryName);
      if (existing) {
        existing.revenue += revenue;
      } else {
        map.set(categoryName, { category: categoryName, revenue });
      }
    }
    return Array.from(map.values()).sort((a, b) => b.revenue - a.revenue);
  }
}

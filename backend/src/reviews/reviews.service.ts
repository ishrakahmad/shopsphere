import { Injectable, NotFoundException, ConflictException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ProductsService } from '../products/products.service';
import { CreateReviewDto, UpdateReviewDto } from './dto/review.dto';
import { OrderStatus } from '@prisma/client';

@Injectable()
export class ReviewsService {
  constructor(
    private prisma: PrismaService,
    private productsService: ProductsService,
  ) {}

  findByProduct(productId: string) {
    return this.prisma.review.findMany({
      where: { productId },
      include: { user: { select: { id: true, name: true, avatar: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(userId: string, productId: string, dto: CreateReviewDto) {
    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product) throw new NotFoundException('Product not found');

    const existing = await this.prisma.review.findUnique({ where: { userId_productId: { userId, productId } } });
    if (existing) throw new ConflictException('You have already reviewed this product');

    // Verified purchase check: must have a delivered order containing this product
    const purchased = await this.prisma.orderItem.findFirst({
      where: { productId, order: { userId, status: OrderStatus.DELIVERED } },
    });
    if (!purchased) {
      throw new BadRequestException('You can only review products from delivered orders');
    }

    await this.prisma.review.create({ data: { userId, productId, rating: dto.rating, comment: dto.comment } });
    await this.productsService.recalculateRating(productId);
    return this.findByProduct(productId);
  }

  async update(userId: string, reviewId: string, dto: UpdateReviewDto) {
    const review = await this.prisma.review.findUnique({ where: { id: reviewId } });
    if (!review) throw new NotFoundException('Review not found');
    if (review.userId !== userId) throw new ForbiddenException();

    await this.prisma.review.update({ where: { id: reviewId }, data: dto });
    await this.productsService.recalculateRating(review.productId);
    return this.findByProduct(review.productId);
  }

  async remove(userId: string, reviewId: string, isAdmin = false) {
    const review = await this.prisma.review.findUnique({ where: { id: reviewId } });
    if (!review) throw new NotFoundException('Review not found');
    if (!isAdmin && review.userId !== userId) throw new ForbiddenException();

    await this.prisma.review.delete({ where: { id: reviewId } });
    await this.productsService.recalculateRating(review.productId);
    return { message: 'Review deleted' };
  }
}

import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto, UpdateProductDto, QueryProductDto } from './dto/product.dto';
import { slugify } from '../common/utils/slugify';

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateProductDto, userId: string, images: string[] = []) {
    const existingSku = await this.prisma.product.findUnique({ where: { sku: dto.sku } });
    if (existingSku) throw new ConflictException('A product with this SKU already exists');

    let slug = slugify(dto.name);
    const slugClash = await this.prisma.product.findUnique({ where: { slug } });
    if (slugClash) slug = `${slug}-${Date.now().toString().slice(-5)}`;

    return this.prisma.product.create({
      data: {
        name: dto.name,
        slug,
        description: dto.description,
        price: dto.price,
        discountPrice: dto.discountPrice,
        stock: dto.stock,
        sku: dto.sku,
        images,
        categoryId: dto.categoryId,
        isFeatured: dto.isFeatured ?? false,
        isNewArrival: dto.isNewArrival ?? true,
        isFlashSale: dto.isFlashSale ?? false,
        flashSaleEnd: dto.flashSaleEnd ? new Date(dto.flashSaleEnd) : null,
        createdById: userId,
      },
      include: { category: true },
    });
  }

  async findAll(query: QueryProductDto) {
    const {
      page = 1,
      limit = 12,
      search,
      categoryId,
      minPrice,
      maxPrice,
      sort,
      featured,
      newArrival,
      bestSeller,
      flashSale,
      minRating,
    } = query;

    const where: Prisma.ProductWhereInput = { isActive: true };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (categoryId) where.categoryId = categoryId;
    if (minPrice !== undefined || maxPrice !== undefined) {
      where.price = {};
      if (minPrice !== undefined) where.price.gte = minPrice;
      if (maxPrice !== undefined) where.price.lte = maxPrice;
    }
    if (featured) where.isFeatured = true;
    if (newArrival) where.isNewArrival = true;
    if (bestSeller) where.isBestSeller = true;
    if (flashSale) {
      where.isFlashSale = true;
      where.flashSaleEnd = { gt: new Date() };
    }
    if (minRating) where.avgRating = { gte: minRating };

    let orderBy: Prisma.ProductOrderByWithRelationInput = { createdAt: 'desc' };
    switch (sort) {
      case 'price_asc':
        orderBy = { price: 'asc' };
        break;
      case 'price_desc':
        orderBy = { price: 'desc' };
        break;
      case 'rating':
        orderBy = { avgRating: 'desc' };
        break;
      case 'popular':
        orderBy = { totalSold: 'desc' };
        break;
      case 'newest':
      default:
        orderBy = { createdAt: 'desc' };
    }

    const [products, total] = await this.prisma.$transaction([
      this.prisma.product.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: Number(limit),
        include: { category: true },
      }),
      this.prisma.product.count({ where }),
    ]);

    return {
      data: products,
      meta: { total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        reviews: { include: { user: { select: { id: true, name: true, avatar: true } } }, orderBy: { createdAt: 'desc' } },
      },
    });
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  async findBySlug(slug: string) {
    const product = await this.prisma.product.findUnique({
      where: { slug },
      include: {
        category: true,
        reviews: { include: { user: { select: { id: true, name: true, avatar: true } } }, orderBy: { createdAt: 'desc' } },
      },
    });
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  async relatedProducts(id: string, take = 8) {
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) throw new NotFoundException('Product not found');

    return this.prisma.product.findMany({
      where: {
        categoryId: product.categoryId,
        id: { not: id },
        isActive: true,
      },
      take,
      orderBy: { avgRating: 'desc' },
      include: { category: true },
    });
  }

  async update(id: string, dto: UpdateProductDto) {
    await this.ensureExists(id);
    const data: any = { ...dto };
    if (dto.name) data.name = dto.name;
    if (dto.flashSaleEnd) data.flashSaleEnd = new Date(dto.flashSaleEnd);
    return this.prisma.product.update({ where: { id }, data, include: { category: true } });
  }

  async addImages(id: string, newImageUrls: string[]) {
    const product = await this.ensureExists(id);
    return this.prisma.product.update({
      where: { id },
      data: { images: [...product.images, ...newImageUrls] },
    });
  }

  async removeImage(id: string, imageUrl: string) {
    const product = await this.ensureExists(id);
    return this.prisma.product.update({
      where: { id },
      data: { images: product.images.filter((img) => img !== imageUrl) },
    });
  }

  async remove(id: string) {
    await this.ensureExists(id);
    await this.prisma.product.update({ where: { id }, data: { isActive: false } });
    return { message: 'Product removed (soft delete)' };
  }

  async hardDelete(id: string) {
    await this.ensureExists(id);
    await this.prisma.product.delete({ where: { id } });
    return { message: 'Product permanently deleted' };
  }

  private async ensureExists(id: string) {
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  // Recalculate avgRating + totalReviews (called from Reviews service)
  async recalculateRating(productId: string) {
    const agg = await this.prisma.review.aggregate({
      where: { productId },
      _avg: { rating: true },
      _count: { rating: true },
    });
    return this.prisma.product.update({
      where: { id: productId },
      data: {
        avgRating: agg._avg.rating ?? 0,
        totalReviews: agg._count.rating,
      },
    });
  }
}

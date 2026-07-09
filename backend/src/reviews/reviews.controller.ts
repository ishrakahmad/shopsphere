import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto, UpdateReviewDto } from './dto/review.dto';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';

@ApiTags('Reviews')
@Controller()
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Public()
  @Get('products/:productId/reviews')
  @ApiOperation({ summary: 'Get all reviews for a product' })
  findByProduct(@Param('productId') productId: string) {
    return this.reviewsService.findByProduct(productId);
  }

  @Post('products/:productId/reviews')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Submit a review (must have a delivered order for this product)' })
  create(@CurrentUser() user: any, @Param('productId') productId: string, @Body() dto: CreateReviewDto) {
    return this.reviewsService.create(user.id, productId, dto);
  }

  @Patch('reviews/:id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update my review' })
  update(@CurrentUser() user: any, @Param('id') id: string, @Body() dto: UpdateReviewDto) {
    return this.reviewsService.update(user.id, id, dto);
  }

  @Delete('reviews/:id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete my review (or any review as Admin)' })
  remove(@CurrentUser() user: any, @Param('id') id: string) {
    const isAdmin = user.role === Role.ADMIN;
    return this.reviewsService.remove(user.id, id, isAdmin);
  }
}

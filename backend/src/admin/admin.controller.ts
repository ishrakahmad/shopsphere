import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { AdminService } from './admin.service';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';

@ApiTags('Admin Dashboard')
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Roles(Role.ADMIN)
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('dashboard')
  @ApiOperation({ summary: '[Admin] Key metrics: total sales, orders, customers, products' })
  dashboard() {
    return this.adminService.dashboard();
  }

  @Get('analytics/monthly-sales')
  @ApiOperation({ summary: '[Admin] Monthly revenue chart data' })
  monthlySales(@Query('months') months?: number) {
    return this.adminService.monthlySales(months ? Number(months) : 6);
  }

  @Get('analytics/top-products')
  @ApiOperation({ summary: '[Admin] Best-selling products' })
  topProducts(@Query('limit') limit?: number) {
    return this.adminService.topProducts(limit ? Number(limit) : 10);
  }

  @Get('analytics/low-stock')
  @ApiOperation({ summary: '[Admin] Products running low on stock' })
  lowStock(@Query('threshold') threshold?: number) {
    return this.adminService.lowStockProducts(threshold ? Number(threshold) : 10);
  }

  @Get('analytics/revenue-by-category')
  @ApiOperation({ summary: '[Admin] Revenue breakdown by category' })
  revenueByCategory() {
    return this.adminService.revenueByCategory();
  }
}

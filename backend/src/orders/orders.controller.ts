import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Role, OrderStatus } from '@prisma/client';
import { OrdersService } from './orders.service';
import { CreateOrderDto, UpdateOrderStatusDto } from './dto/order.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { PaginationDto } from '../common/dto/pagination.dto';

@ApiTags('Orders')
@ApiBearerAuth()
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post('checkout')
  @ApiOperation({ summary: 'Place an order from the current cart (Cash on Delivery supported)' })
  checkout(@CurrentUser() user: any, @Body() dto: CreateOrderDto) {
    return this.ordersService.checkout(user.id, dto);
  }

  @Get('my')
  @ApiOperation({ summary: 'My order history' })
  findMyOrders(@CurrentUser() user: any, @Query() pagination: PaginationDto) {
    return this.ordersService.findMyOrders(user.id, pagination);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get order details / invoice data' })
  findOne(@CurrentUser() user: any, @Param('id') id: string) {
    const isAdmin = user.role === Role.ADMIN;
    return this.ordersService.findOne(user.id, id, isAdmin);
  }

  @Patch(':id/cancel')
  @ApiOperation({ summary: 'Cancel my order (if still pending/processing)' })
  cancel(@CurrentUser() user: any, @Param('id') id: string) {
    return this.ordersService.cancelOrder(user.id, id);
  }

  // ---- Admin ----

  @Get()
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: '[Admin] List all orders, optionally filter by status' })
  adminFindAll(@Query() pagination: PaginationDto, @Query('status') status?: OrderStatus) {
    return this.ordersService.adminFindAll(pagination, status);
  }

  @Patch(':id/status')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: '[Admin] Update order status (Pending/Processing/Shipped/Delivered/Cancelled)' })
  updateStatus(@Param('id') id: string, @Body() dto: UpdateOrderStatusDto) {
    return this.ordersService.updateStatus(id, dto);
  }
}

import { IsString, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { OrderStatus, PaymentMethod } from '@prisma/client';

export class CreateOrderDto {
  @ApiProperty({ description: 'Address id to use for billing' })
  @IsString()
  billingAddressId: string;

  @ApiProperty({ description: 'Address id to use for shipping' })
  @IsString()
  shippingAddressId: string;

  @ApiProperty({ enum: PaymentMethod, default: PaymentMethod.COD })
  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;
}

export class UpdateOrderStatusDto {
  @ApiProperty({ enum: OrderStatus })
  @IsEnum(OrderStatus)
  status: OrderStatus;
}

import { IsString, IsOptional, IsNumber, IsInt, IsBoolean, Min, MinLength, IsDateString, IsArray } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

// Multipart/form-data always sends booleans as the strings "true"/"false".
// class-transformer's @Type(() => Boolean) calls Boolean(value), which treats
// ANY non-empty string (including "false") as true. This transformer fixes that.
const toBoolean = ({ value }: { value: unknown }) => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') return value.toLowerCase() === 'true';
  return Boolean(value);
};

export class CreateProductDto {
  @ApiProperty({ example: 'Wireless Headphones' })
  @IsString()
  @MinLength(2)
  name: string;

  @ApiProperty()
  @IsString()
  @MinLength(10)
  description: string;

  @ApiProperty({ example: 49.99 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  price: number;

  @ApiProperty({ required: false, example: 39.99 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  discountPrice?: number;

  @ApiProperty({ example: 100 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  stock: number;

  @ApiProperty({ example: 'SKU-12345' })
  @IsString()
  sku: string;

  @ApiProperty()
  @IsString()
  categoryId: string;

  @ApiProperty({ required: false, default: false })
  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  isFeatured?: boolean;

  @ApiProperty({ required: false, default: false })
  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  isNewArrival?: boolean;

  @ApiProperty({ required: false, default: false })
  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  isBestSeller?: boolean;

  @ApiProperty({ required: false, default: false })
  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  isFlashSale?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  flashSaleEnd?: string;
}

export class UpdateProductDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MinLength(10)
  description?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  price?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  discountPrice?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  stock?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isFeatured?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isNewArrival?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isBestSeller?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isFlashSale?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  flashSaleEnd?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;

  @ApiProperty({ required: false, type: [String] })
  @IsOptional()
  @IsArray()
  images?: string[];
}

export class QueryProductDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiProperty({ required: false })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 12;

  @ApiProperty({ required: false, description: 'Search by product name/description' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  minPrice?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  maxPrice?: number;

  @ApiProperty({ required: false, description: 'e.g. price_asc, price_desc, newest, rating, popular' })
  @IsOptional()
  @IsString()
  sort?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  featured?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  newArrival?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  bestSeller?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  flashSale?: boolean;

  @ApiProperty({ required: false, minimum: 1, maximum: 5 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  minRating?: number;
}

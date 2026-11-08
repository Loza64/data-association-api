import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { IdRefDto } from '../../../shared/dto/id-ref.dto';
import { OrderStatus } from '../domain/order.entity';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

export const ORDER_MAX_ITEMS = 50;
export const ORDER_MAX_QUANTITY = 1000;

export class OrderItemDto {
  @ValidateNested()
  @Type(() => IdRefDto)
  product!: IdRefDto;

  @IsInt()
  @Min(1)
  @Max(ORDER_MAX_QUANTITY)
  quantity!: number;
}

export class CreateOrderDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(ORDER_MAX_ITEMS)
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items!: OrderItemDto[];

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(500)
  notes?: string;
}

export class UpdateOrderDto {
  @IsOptional()
  @IsIn(['completed', 'cancelled'])
  status?: Exclude<OrderStatus, 'pending'>;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(500)
  notes?: string;
}

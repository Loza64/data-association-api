import { IsMongoId, IsOptional } from 'class-validator';
import { SearchQueryDto } from '../../../shared/pagination/pagination-query.dto';

export class ProductQueryDto extends SearchQueryDto {
  @IsOptional()
  @IsMongoId()
  categoryId?: string;
}

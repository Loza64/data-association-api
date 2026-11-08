import { Page } from '../../../shared/pagination/pagination.types';
import { Product } from './product.entity';

export interface ProductListParams {
  page: number;
  pageSize: number;
  search?: string;
  categoryId?: string;
}

export interface ProductData {
  name: string;
  description: string;
  price: number;
  isActive: boolean;
  categoryId: string;
}

export interface ProductRepository {
  create(data: ProductData): Promise<Product>;
  findAll(params: ProductListParams): Promise<Page<Product>>;
  findById(id: string): Promise<Product | null>;
  findByIds(ids: string[]): Promise<Product[]>;
  update(id: string, data: Partial<ProductData>): Promise<Product | null>;
  delete(id: string): Promise<boolean>;
  exists(id: string): Promise<boolean>;
  countByCategory(categoryId: string): Promise<number>;
}

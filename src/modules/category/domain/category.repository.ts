import { ListParams, Page } from '../../../shared/pagination/pagination.types';
import { Category } from './category.entity';

export interface CategoryRepository {
  create(data: { name: string; description: string }): Promise<Category>;
  findAll(params: ListParams): Promise<Page<Category>>;
  findById(id: string): Promise<Category | null>;
  exists(id: string): Promise<boolean>;
  update(id: string, data: { name?: string; description?: string }): Promise<Category | null>;
  delete(id: string): Promise<boolean>;
}

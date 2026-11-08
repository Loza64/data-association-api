import { CategorySummary } from '../../category/domain/category.entity';

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  isActive: boolean;
  categoryId: string;
  category: CategorySummary | null;
  createdAt: Date;
  updatedAt: Date;
}

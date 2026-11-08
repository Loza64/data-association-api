import { Category } from '../../domain/category.entity';
import type { CategoryDocument } from './category.schema';

export const toCategoryDomain = (doc: CategoryDocument): Category => ({
  id: doc._id.toString(),
  name: doc.name,
  description: doc.description ?? '',
  ...(doc.productsCount !== undefined ? { productsCount: doc.productsCount } : {}),
  createdAt: doc.createdAt,
  updatedAt: doc.updatedAt,
});

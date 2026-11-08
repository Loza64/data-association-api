import { Types } from 'mongoose';
import { Product } from '../../domain/product.entity';
import type { ProductDocument } from './product.schema';

export const toProductDomain = (doc: ProductDocument): Product => {
  const raw = doc.category;
  const populated = raw !== null && !(raw instanceof Types.ObjectId) && 'name' in raw ? raw : null;
  const categoryId = raw === null ? '' : populated ? populated._id.toString() : (raw as Types.ObjectId).toString();

  return {
    id: doc._id.toString(),
    name: doc.name,
    description: doc.description ?? '',
    price: doc.price,
    isActive: doc.isActive,
    categoryId,
    category: populated ? { id: populated._id.toString(), name: populated.name } : null,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
};

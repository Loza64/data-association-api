import { Types } from 'mongoose';
import { Order, OrderItem } from '../../domain/order.entity';
import type { OrderDocument, OrderItemDocument } from './order.schema';

const isPopulated = <T extends object>(value: unknown): value is T =>
  value !== null && typeof value === 'object' && !(value instanceof Types.ObjectId) && '_id' in value;

const toItemDomain = (item: OrderItemDocument): OrderItem => {
  const raw = item.product;
  const populated = isPopulated<Exclude<OrderItemDocument['product'], Types.ObjectId | null>>(raw) ? raw : null;
  const category = populated && isPopulated<{ _id: Types.ObjectId; name: string }>(populated.category) ? populated.category : null;

  return {
    productId: raw === null ? '' : populated ? populated._id.toString() : (raw as Types.ObjectId).toString(),
    product: populated
      ? {
          id: populated._id.toString(),
          name: populated.name,
          price: populated.price,
          isActive: populated.isActive,
          category: category ? { id: category._id.toString(), name: category.name } : null,
        }
      : null,
    productName: item.productName,
    unitPrice: item.unitPrice,
    quantity: item.quantity,
    subtotal: item.subtotal,
  };
};

export const toOrderDomain = (doc: OrderDocument): Order => {
  const raw = doc.user;
  const populated = isPopulated<{ _id: Types.ObjectId; name: string; username: string }>(raw) ? raw : null;

  return {
    id: doc._id.toString(),
    userId: raw === null ? '' : populated ? populated._id.toString() : (raw as Types.ObjectId).toString(),
    user: populated ? { id: populated._id.toString(), name: populated.name, username: populated.username } : null,
    items: doc.items.map(toItemDomain),
    total: doc.total,
    status: doc.status,
    notes: doc.notes ?? '',
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
};

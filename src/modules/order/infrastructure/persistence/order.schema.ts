import { model, PaginateModel, Schema, Types } from 'mongoose';
import mongoosePaginate from 'mongoose-paginate-v2';
import { ORDER_STATUSES, OrderStatus } from '../../domain/order.entity';

export interface PopulatedRef {
  _id: Types.ObjectId;
  name: string;
}

export interface OrderItemDocument {
  product: Types.ObjectId | null | (PopulatedRef & { price: number; isActive: boolean; category: Types.ObjectId | PopulatedRef | null });
  productName: string;
  unitPrice: number;
  quantity: number;
  subtotal: number;
}

export interface OrderDocument {
  _id: Types.ObjectId;
  user: Types.ObjectId | null | (PopulatedRef & { username: string });
  items: OrderItemDocument[];
  total: number;
  status: OrderStatus;
  notes: string;
  createdAt: Date;
  updatedAt: Date;
}

const orderItemSchema = new Schema<OrderItemDocument>(
  {
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    productName: { type: String, required: true },
    unitPrice: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 1, max: 1000 },
    subtotal: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

const orderSchema = new Schema<OrderDocument>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    items: {
      type: [orderItemSchema],
      validate: { validator: (items: unknown[]) => items.length >= 1 && items.length <= 50, message: 'Una orden debe tener entre 1 y 50 ítems' },
    },
    total: { type: Number, required: true, min: 0 },
    status: { type: String, enum: ORDER_STATUSES, default: 'pending' },
    notes: { type: String, trim: true, maxlength: 500, default: '' },
  },
  { timestamps: true, versionKey: false },
);

orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ user: 1, status: 1, createdAt: -1 });
orderSchema.index({ 'items.product': 1 });

orderSchema.plugin(mongoosePaginate);

export const OrderModel = model<OrderDocument, PaginateModel<OrderDocument>>('Order', orderSchema);

import { model, PaginateModel, Schema, Types } from 'mongoose';
import mongoosePaginate from 'mongoose-paginate-v2';

export interface ProductDocument {
  _id: Types.ObjectId;
  name: string;
  description: string;
  price: number;
  isActive: boolean;
  category: Types.ObjectId | { _id: Types.ObjectId; name: string } | null;
  createdAt: Date;
  updatedAt: Date;
}

const productSchema = new Schema<ProductDocument>(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 120 },
    description: { type: String, trim: true, maxlength: 1000, default: '' },
    price: { type: Number, required: true, min: 0.01, max: 1_000_000 },
    isActive: { type: Boolean, default: true },
    category: { type: Schema.Types.ObjectId, ref: 'Category', required: true, index: true },
  },
  { timestamps: true, versionKey: false },
);

productSchema.index({ name: 1 });

productSchema.plugin(mongoosePaginate);

export const ProductModel = model<ProductDocument, PaginateModel<ProductDocument>>('Product', productSchema);

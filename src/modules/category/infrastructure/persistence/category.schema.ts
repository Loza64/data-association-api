import { HydratedDocument, model, PaginateModel, Schema, Types } from 'mongoose';
import mongoosePaginate from 'mongoose-paginate-v2';

export interface CategoryDocument {
  _id: Types.ObjectId;
  name: string;
  description: string;
  productsCount?: number;
  createdAt: Date;
  updatedAt: Date;
}

export const CATEGORY_COLLATION = { locale: 'es', strength: 2 } as const;

const categorySchema = new Schema<CategoryDocument>(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 60 },
    description: { type: String, trim: true, maxlength: 500, default: '' },
  },
  { timestamps: true, versionKey: false },
);

categorySchema.index({ name: 1 }, { unique: true, collation: CATEGORY_COLLATION });

categorySchema.virtual('productsCount', {
  ref: 'Product',
  localField: '_id',
  foreignField: 'category',
  count: true,
});

categorySchema.plugin(mongoosePaginate);

export type CategoryHydrated = HydratedDocument<CategoryDocument>;

export const CategoryModel = model<CategoryDocument, PaginateModel<CategoryDocument>>('Category', categorySchema);

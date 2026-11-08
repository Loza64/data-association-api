import { Page } from '../../../../shared/pagination/pagination.types';
import { containsRegex } from '../../../../shared/pagination/regex-search.util';
import { CategoryModel } from '../../../category/infrastructure/persistence/category.schema';
import { Product } from '../../domain/product.entity';
import { ProductData, ProductListParams, ProductRepository } from '../../domain/product.repository';
import { toProductDomain } from './product.mapper';
import { ProductModel } from './product.schema';

const populateCategory = { path: 'category', select: 'name', model: CategoryModel };

export class MongooseProductRepository implements ProductRepository {
  async create(data: ProductData): Promise<Product> {
    const { categoryId, ...rest } = data;
    const created = await ProductModel.create({ ...rest, category: categoryId });
    const doc = await ProductModel.findById(created._id).populate(populateCategory).lean();
    return toProductDomain(doc!);
  }

  async findAll({ page, pageSize, search, categoryId }: ProductListParams): Promise<Page<Product>> {
    const filter: Record<string, unknown> = {};
    if (search) filter.name = containsRegex(search);
    if (categoryId) filter.category = categoryId;

    const result = await ProductModel.paginate(filter, {
      page,
      limit: pageSize,
      sort: { createdAt: -1, _id: -1 },
      populate: populateCategory,
      lean: true,
    });

    return {
      items: result.docs.map(toProductDomain),
      meta: {
        page: result.page ?? page,
        pageSize: result.limit,
        pageCount: result.totalPages,
        total: result.totalDocs,
      },
    };
  }

  async findById(id: string): Promise<Product | null> {
    const doc = await ProductModel.findById(id).populate(populateCategory).lean();
    return doc ? toProductDomain(doc) : null;
  }

  async findByIds(ids: string[]): Promise<Product[]> {
    const docs = await ProductModel.find({ _id: { $in: ids } }).populate(populateCategory).lean();
    return docs.map(toProductDomain);
  }

  async update(id: string, data: Partial<ProductData>): Promise<Product | null> {
    const { categoryId, ...rest } = data;
    const changes: Record<string, unknown> = { ...rest };
    if (categoryId !== undefined) changes.category = categoryId;

    const doc = await ProductModel.findByIdAndUpdate(
      id,
      { $set: changes },
      { returnDocument: 'after', runValidators: true },
    )
      .populate(populateCategory)
      .lean();
    return doc ? toProductDomain(doc) : null;
  }

  async delete(id: string): Promise<boolean> {
    const { deletedCount } = await ProductModel.deleteOne({ _id: id });
    return deletedCount === 1;
  }

  async exists(id: string): Promise<boolean> {
    return (await ProductModel.exists({ _id: id })) !== null;
  }

  countByCategory(categoryId: string): Promise<number> {
    return ProductModel.countDocuments({ category: categoryId });
  }
}

import { AppError } from '../../../../shared/errors/AppError';
import { isDuplicateKeyError } from '../../../../shared/database/mongo';
import { ListParams, Page } from '../../../../shared/pagination/pagination.types';
import { containsRegex } from '../../../../shared/pagination/regex-search.util';
import { Category } from '../../domain/category.entity';
import { CategoryRepository } from '../../domain/category.repository';
import { toCategoryDomain } from './category.mapper';
import { CATEGORY_COLLATION, CategoryModel } from './category.schema';

const nameTaken = (): AppError => new AppError('Ya existe una categoría con ese nombre', 409);

export class MongooseCategoryRepository implements CategoryRepository {
  async create(data: { name: string; description: string }): Promise<Category> {
    try {
      const created = await CategoryModel.create(data);
      return { ...toCategoryDomain(created.toObject()), productsCount: 0 };
    } catch (err) {
      if (isDuplicateKeyError(err)) throw nameTaken();
      throw err;
    }
  }

  async findAll({ page, pageSize, search }: ListParams): Promise<Page<Category>> {
    const filter = search ? { $or: [{ name: containsRegex(search) }, { description: containsRegex(search) }] } : {};

    const result = await CategoryModel.paginate(filter, {
      page,
      limit: pageSize,
      sort: { name: 1, _id: 1 },
      collation: CATEGORY_COLLATION,
      populate: { path: 'productsCount' },
      lean: true,
    });

    return {
      items: result.docs.map(toCategoryDomain),
      meta: {
        page: result.page ?? page,
        pageSize: result.limit,
        pageCount: result.totalPages,
        total: result.totalDocs,
      },
    };
  }

  async findById(id: string): Promise<Category | null> {
    const doc = await CategoryModel.findById(id).populate('productsCount').lean();
    return doc ? toCategoryDomain(doc) : null;
  }

  async exists(id: string): Promise<boolean> {
    return (await CategoryModel.exists({ _id: id })) !== null;
  }

  async update(id: string, data: { name?: string; description?: string }): Promise<Category | null> {
    try {
      const doc = await CategoryModel.findByIdAndUpdate(
        id,
        { $set: data },
        { returnDocument: 'after', runValidators: true },
      )
        .populate('productsCount')
        .lean();
      return doc ? toCategoryDomain(doc) : null;
    } catch (err) {
      if (isDuplicateKeyError(err)) throw nameTaken();
      throw err;
    }
  }

  async delete(id: string): Promise<boolean> {
    const { deletedCount } = await CategoryModel.deleteOne({ _id: id });
    return deletedCount === 1;
  }
}

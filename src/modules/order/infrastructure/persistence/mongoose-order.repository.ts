import { Page } from '../../../../shared/pagination/pagination.types';
import { CategoryModel } from '../../../category/infrastructure/persistence/category.schema';
import { ProductModel } from '../../../product/infrastructure/persistence/product.schema';
import { UserModel } from '../../../user/infrastructure/persistence/user.schema';
import { NewOrder, Order, OrderStatus } from '../../domain/order.entity';
import { OrderListParams, OrderRepository } from '../../domain/order.repository';
import { toOrderDomain } from './order.mapper';
import { OrderModel } from './order.schema';

const populateRelations = [
  { path: 'user', select: 'name username', model: UserModel },
  {
    path: 'items.product',
    select: 'name price isActive category',
    model: ProductModel,
    populate: { path: 'category', select: 'name', model: CategoryModel },
  },
];

export class MongooseOrderRepository implements OrderRepository {
  async create(order: NewOrder): Promise<Order> {
    const created = await OrderModel.create({
      user: order.userId,
      items: order.items.map(({ productId, ...rest }) => ({ product: productId, ...rest })),
      total: order.total,
      notes: order.notes,
    });
    const doc = await OrderModel.findById(created._id).populate(populateRelations).lean();
    return toOrderDomain(doc!);
  }

  async findByUser(userId: string, { page, pageSize, status }: OrderListParams): Promise<Page<Order>> {
    const filter: Record<string, unknown> = { user: userId };
    if (status) filter.status = status;

    const result = await OrderModel.paginate(filter, {
      page,
      limit: pageSize,
      sort: { createdAt: -1, _id: -1 },
      populate: populateRelations,
      lean: true,
    });

    return {
      items: result.docs.map(toOrderDomain),
      meta: {
        page: result.page ?? page,
        pageSize: result.limit,
        pageCount: result.totalPages,
        total: result.totalDocs,
      },
    };
  }

  async findById(id: string): Promise<Order | null> {
    const doc = await OrderModel.findById(id).populate(populateRelations).lean();
    return doc ? toOrderDomain(doc) : null;
  }

  async updatePending(id: string, changes: { status?: OrderStatus; notes?: string }): Promise<Order | null> {
    const set: Record<string, unknown> = {};
    if (changes.status !== undefined) set.status = changes.status;
    if (changes.notes !== undefined) set.notes = changes.notes;

    const doc = await OrderModel.findOneAndUpdate(
      { _id: id, status: 'pending' },
      { $set: set },
      { returnDocument: 'after', runValidators: true },
    )
      .populate(populateRelations)
      .lean();
    return doc ? toOrderDomain(doc) : null;
  }

  async delete(id: string): Promise<boolean> {
    const { deletedCount } = await OrderModel.deleteOne({ _id: id, status: { $ne: 'completed' } });
    return deletedCount === 1;
  }

  async existsByUser(userId: string): Promise<boolean> {
    return (await OrderModel.exists({ user: userId })) !== null;
  }

  async existsByProduct(productId: string): Promise<boolean> {
    return (await OrderModel.exists({ 'items.product': productId })) !== null;
  }
}

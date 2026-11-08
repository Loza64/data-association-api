import { AppError } from '../shared/errors/AppError';
import { ListParams, Page } from '../shared/pagination/pagination.types';
import { Category } from '../modules/category/domain/category.entity';
import { CategoryRepository } from '../modules/category/domain/category.repository';
import { NewOrder, Order, OrderStatus } from '../modules/order/domain/order.entity';
import { OrderListParams, OrderRepository } from '../modules/order/domain/order.repository';
import { Product } from '../modules/product/domain/product.entity';
import { ProductData, ProductListParams, ProductRepository } from '../modules/product/domain/product.repository';
import { User } from '../modules/user/domain/user.entity';
import { UserRepository } from '../modules/user/domain/user.repository';

let sequence = 0;
const nextId = (): string => {
  sequence += 1;
  return sequence.toString(16).padStart(24, '0');
};

const paginate = <T>(all: T[], page: number, pageSize: number): Page<T> => ({
  items: all.slice((page - 1) * pageSize, page * pageSize),
  meta: { page, pageSize, pageCount: Math.max(1, Math.ceil(all.length / pageSize)), total: all.length },
});

interface StoredUser {
  user: User;
  lockedUntil: Date | null;
  lastAttemptAt: Date | null;
}

export class InMemoryUserRepository implements UserRepository {
  readonly stored = new Map<string, StoredUser>();

  private clone(entry: StoredUser, withSecrets: boolean): User {
    const copy = Object.assign(new User(), entry.user);
    if (!withSecrets) {
      copy.password = '';
      copy.failedLoginAttempts = 0;
    }
    return copy;
  }

  private byUsername(username: string): StoredUser | undefined {
    return [...this.stored.values()].find((entry) => entry.user.username === username);
  }

  lockedUntilOf(id: string): Date | null {
    return this.stored.get(id)?.lockedUntil ?? null;
  }

  async findAll({ page, pageSize }: ListParams): Promise<Page<User>> {
    return paginate([...this.stored.values()].map((entry) => this.clone(entry, false)), page, pageSize);
  }

  async findById(id: string): Promise<User | null> {
    const entry = this.stored.get(id);
    return entry ? this.clone(entry, false) : null;
  }

  async findByUsername(username: string): Promise<User | null> {
    const entry = this.byUsername(username);
    return entry ? this.clone(entry, false) : null;
  }

  async exists(id: string): Promise<boolean> {
    return this.stored.has(id);
  }

  async create(user: User): Promise<User> {
    if (this.byUsername(user.username)) throw new AppError('El nombre de usuario ya está en uso', 409);
    const id = nextId();
    const stored = Object.assign(new User(), user, { id, createdAt: new Date(), updatedAt: new Date() });
    this.stored.set(id, { user: stored, lockedUntil: null, lastAttemptAt: null });
    return this.clone(this.stored.get(id) as StoredUser, false);
  }

  async update(user: User): Promise<User> {
    const entry = this.stored.get(user.id);
    if (!entry) throw new AppError('Usuario no encontrado', 404);
    entry.user.name = user.name;
    entry.user.username = user.username;
    return this.clone(entry, false);
  }

  async delete(id: string): Promise<boolean> {
    return this.stored.delete(id);
  }

  async reserveLoginAttempt(username: string, now: Date, windowMs: number): Promise<User | null> {
    const entry = this.byUsername(username);
    if (!entry) return null;

    const lockExpired = entry.lockedUntil !== null && entry.lockedUntil <= now;
    const windowExpired = entry.lastAttemptAt !== null && entry.lastAttemptAt < new Date(now.getTime() - windowMs);
    if (lockExpired || windowExpired) {
      entry.user.failedLoginAttempts = 0;
      entry.lockedUntil = null;
      entry.lastAttemptAt = null;
    }

    if (entry.lockedUntil !== null && entry.lockedUntil > now) return null;

    entry.user.failedLoginAttempts += 1;
    entry.lastAttemptAt = now;
    return this.clone(entry, true);
  }

  async lockAccount(id: string, until: Date): Promise<void> {
    const entry = this.stored.get(id);
    if (entry) entry.lockedUntil = until;
  }

  async clearLoginFailures(id: string): Promise<void> {
    const entry = this.stored.get(id);
    if (!entry) return;
    entry.user.failedLoginAttempts = 0;
    entry.lockedUntil = null;
    entry.lastAttemptAt = null;
  }
}

interface StoredProduct {
  id: string;
  name: string;
  description: string;
  price: number;
  isActive: boolean;
  categoryId: string;
  createdAt: Date;
  updatedAt: Date;
}

interface StoredOrder {
  id: string;
  userId: string;
  items: NewOrder['items'];
  total: number;
  status: OrderStatus;
  notes: string;
  createdAt: Date;
  updatedAt: Date;
}

export class InMemoryDatabase {
  readonly users = new InMemoryUserRepository();
  readonly categories = new Map<string, Omit<Category, 'productsCount'>>();
  readonly products = new Map<string, StoredProduct>();
  readonly orders = new Map<string, StoredOrder>();
}

export class InMemoryCategoryRepository implements CategoryRepository {
  constructor(private readonly db: InMemoryDatabase) {}

  private view(id: string): Category | null {
    const category = this.db.categories.get(id);
    if (!category) return null;
    const productsCount = [...this.db.products.values()].filter((product) => product.categoryId === id).length;
    return { ...category, productsCount };
  }

  private nameTaken(name: string, exceptId?: string): boolean {
    return [...this.db.categories.values()].some(
      (category) => category.id !== exceptId && category.name.toLowerCase() === name.toLowerCase(),
    );
  }

  async create(data: { name: string; description: string }): Promise<Category> {
    if (this.nameTaken(data.name)) throw new AppError('Ya existe una categoría con ese nombre', 409);
    const id = nextId();
    this.db.categories.set(id, { id, ...data, createdAt: new Date(), updatedAt: new Date() });
    return this.view(id) as Category;
  }

  async findAll({ page, pageSize, search }: ListParams): Promise<Page<Category>> {
    const all = [...this.db.categories.keys()]
      .map((id) => this.view(id) as Category)
      .filter((category) => !search || category.name.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => a.name.localeCompare(b.name));
    return paginate(all, page, pageSize);
  }

  async findById(id: string): Promise<Category | null> {
    return this.view(id);
  }

  async exists(id: string): Promise<boolean> {
    return this.db.categories.has(id);
  }

  async update(id: string, data: { name?: string; description?: string }): Promise<Category | null> {
    const category = this.db.categories.get(id);
    if (!category) return null;
    if (data.name !== undefined && this.nameTaken(data.name, id)) {
      throw new AppError('Ya existe una categoría con ese nombre', 409);
    }
    Object.assign(category, data, { updatedAt: new Date() });
    return this.view(id);
  }

  async delete(id: string): Promise<boolean> {
    return this.db.categories.delete(id);
  }
}

export class InMemoryProductRepository implements ProductRepository {
  constructor(private readonly db: InMemoryDatabase) {}

  private view(stored: StoredProduct): Product {
    const category = this.db.categories.get(stored.categoryId);
    const { categoryId, ...rest } = stored;
    return { ...rest, categoryId, category: category ? { id: category.id, name: category.name } : null };
  }

  async create(data: ProductData): Promise<Product> {
    const id = nextId();
    const stored: StoredProduct = { id, ...data, createdAt: new Date(), updatedAt: new Date() };
    this.db.products.set(id, stored);
    return this.view(stored);
  }

  async findAll({ page, pageSize, search, categoryId }: ProductListParams): Promise<Page<Product>> {
    const all = [...this.db.products.values()]
      .filter((product) => !search || product.name.toLowerCase().includes(search.toLowerCase()))
      .filter((product) => !categoryId || product.categoryId === categoryId)
      .map((product) => this.view(product));
    return paginate(all, page, pageSize);
  }

  async findById(id: string): Promise<Product | null> {
    const stored = this.db.products.get(id);
    return stored ? this.view(stored) : null;
  }

  async findByIds(ids: string[]): Promise<Product[]> {
    return ids.flatMap((id) => {
      const stored = this.db.products.get(id);
      return stored ? [this.view(stored)] : [];
    });
  }

  async update(id: string, data: Partial<ProductData>): Promise<Product | null> {
    const stored = this.db.products.get(id);
    if (!stored) return null;
    Object.assign(stored, data, { updatedAt: new Date() });
    return this.view(stored);
  }

  async delete(id: string): Promise<boolean> {
    return this.db.products.delete(id);
  }

  async exists(id: string): Promise<boolean> {
    return this.db.products.has(id);
  }

  async countByCategory(categoryId: string): Promise<number> {
    return [...this.db.products.values()].filter((product) => product.categoryId === categoryId).length;
  }
}

export class InMemoryOrderRepository implements OrderRepository {
  constructor(private readonly db: InMemoryDatabase) {}

  private view(stored: StoredOrder): Order {
    const user = this.db.users.stored.get(stored.userId)?.user;
    return {
      id: stored.id,
      userId: stored.userId,
      user: user ? { id: user.id, name: user.name, username: user.username } : null,
      items: stored.items.map((item) => {
        const product = this.db.products.get(item.productId);
        const category = product ? this.db.categories.get(product.categoryId) : undefined;
        return {
          productId: item.productId,
          product: product
            ? {
                id: product.id,
                name: product.name,
                price: product.price,
                isActive: product.isActive,
                category: category ? { id: category.id, name: category.name } : null,
              }
            : null,
          productName: item.productName,
          unitPrice: item.unitPrice,
          quantity: item.quantity,
          subtotal: item.subtotal,
        };
      }),
      total: stored.total,
      status: stored.status,
      notes: stored.notes,
      createdAt: stored.createdAt,
      updatedAt: stored.updatedAt,
    };
  }

  async create(order: NewOrder): Promise<Order> {
    const id = nextId();
    const stored: StoredOrder = { id, ...order, status: 'pending', createdAt: new Date(), updatedAt: new Date() };
    this.db.orders.set(id, stored);
    return this.view(stored);
  }

  async findByUser(userId: string, { page, pageSize, status }: OrderListParams): Promise<Page<Order>> {
    const all = [...this.db.orders.values()]
      .filter((order) => order.userId === userId && (!status || order.status === status))
      .reverse()
      .map((order) => this.view(order));
    return paginate(all, page, pageSize);
  }

  async findById(id: string): Promise<Order | null> {
    const stored = this.db.orders.get(id);
    return stored ? this.view(stored) : null;
  }

  async updatePending(id: string, changes: { status?: OrderStatus; notes?: string }): Promise<Order | null> {
    const stored = this.db.orders.get(id);
    if (!stored || stored.status !== 'pending') return null;
    Object.assign(stored, changes, { updatedAt: new Date() });
    return this.view(stored);
  }

  async delete(id: string): Promise<boolean> {
    const stored = this.db.orders.get(id);
    if (!stored || stored.status === 'completed') return false;
    return this.db.orders.delete(id);
  }

  async existsByUser(userId: string): Promise<boolean> {
    return [...this.db.orders.values()].some((order) => order.userId === userId);
  }

  async existsByProduct(productId: string): Promise<boolean> {
    return [...this.db.orders.values()].some((order) => order.items.some((item) => item.productId === productId));
  }
}

export const buildInMemoryRepositories = () => {
  const db = new InMemoryDatabase();
  return {
    db,
    userRepository: db.users,
    categoryRepository: new InMemoryCategoryRepository(db),
    productRepository: new InMemoryProductRepository(db),
    orderRepository: new InMemoryOrderRepository(db),
  };
};

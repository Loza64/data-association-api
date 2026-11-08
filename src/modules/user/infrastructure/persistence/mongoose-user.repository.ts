import { AppError } from '../../../../shared/errors/AppError';
import { isDuplicateKeyError } from '../../../../shared/database/mongo';
import { ListParams, Page } from '../../../../shared/pagination/pagination.types';
import { containsRegex } from '../../../../shared/pagination/regex-search.util';
import { User } from '../../domain/user.entity';
import { UserRepository } from '../../domain/user.repository';
import { toUserDomain } from './user.mapper';
import { UserModel } from './user.schema';

const usernameTaken = (): AppError => new AppError('El nombre de usuario ya está en uso', 409);

export class MongooseUserRepository implements UserRepository {
  async findAll({ page, pageSize, search }: ListParams): Promise<Page<User>> {
    const filter: Record<string, unknown> = {};
    if (search) {
      const pattern = containsRegex(search);
      filter.$or = [{ name: pattern }, { username: pattern }];
    }

    const result = await UserModel.paginate(filter, {
      page,
      limit: pageSize,
      sort: { createdAt: -1, _id: -1 },
      lean: true,
    });

    return {
      items: result.docs.map(toUserDomain),
      meta: {
        page: result.page ?? page,
        pageSize: result.limit,
        pageCount: result.totalPages,
        total: result.totalDocs,
      },
    };
  }

  async findById(id: string): Promise<User | null> {
    const doc = await UserModel.findById(id).lean();
    return doc ? toUserDomain(doc) : null;
  }

  async findByUsername(username: string): Promise<User | null> {
    const doc = await UserModel.findOne({ username }).lean();
    return doc ? toUserDomain(doc) : null;
  }

  async exists(id: string): Promise<boolean> {
    return (await UserModel.exists({ _id: id })) !== null;
  }

  async create(user: User): Promise<User> {
    try {
      const created = await UserModel.create({ name: user.name, username: user.username, password: user.password });
      return toUserDomain(created.toObject());
    } catch (err) {
      if (isDuplicateKeyError(err)) throw usernameTaken();
      throw err;
    }
  }

  async update(user: User): Promise<User> {
    try {
      const updated = await UserModel.findByIdAndUpdate(
        user.id,
        { $set: { name: user.name, username: user.username } },
        { returnDocument: 'after', runValidators: true },
      ).lean();

      if (!updated) {
        throw new AppError('Usuario no encontrado', 404);
      }
      return toUserDomain(updated);
    } catch (err) {
      if (isDuplicateKeyError(err)) throw usernameTaken();
      throw err;
    }
  }

  async delete(id: string): Promise<boolean> {
    const { deletedCount } = await UserModel.deleteOne({ _id: id });
    return deletedCount === 1;
  }

  async reserveLoginAttempt(username: string, now: Date, windowMs: number): Promise<User | null> {
    await UserModel.updateOne(
      {
        username,
        $or: [{ lockedUntil: { $lte: now } }, { lastAttemptAt: { $lt: new Date(now.getTime() - windowMs) } }],
      },
      { $set: { failedLoginAttempts: 0, lastAttemptAt: null, lockedUntil: null } },
      { timestamps: false },
    );

    const doc = await UserModel.findOneAndUpdate(
      { username, lockedUntil: { $not: { $gt: now } } },
      { $inc: { failedLoginAttempts: 1 }, $set: { lastAttemptAt: now } },
      { returnDocument: 'after', timestamps: false },
    )
      .select('+password +failedLoginAttempts')
      .lean();

    return doc ? toUserDomain(doc) : null;
  }

  async lockAccount(id: string, until: Date): Promise<void> {
    await UserModel.updateOne({ _id: id }, { $set: { lockedUntil: until } }, { timestamps: false });
  }

  async clearLoginFailures(id: string): Promise<void> {
    await UserModel.updateOne(
      { _id: id },
      { $set: { failedLoginAttempts: 0, lastAttemptAt: null, lockedUntil: null } },
      { timestamps: false },
    );
  }
}

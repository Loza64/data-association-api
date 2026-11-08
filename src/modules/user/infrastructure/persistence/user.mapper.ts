import { User } from '../../domain/user.entity';
import type { UserDocument } from './user.schema';

export const toUserDomain = (doc: UserDocument): User =>
  Object.assign(new User(), {
    id: doc._id.toString(),
    name: doc.name,
    username: doc.username,
    password: doc.password ?? '',
    failedLoginAttempts: doc.failedLoginAttempts ?? 0,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  });

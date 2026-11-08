import { ListParams, Page } from '../../../shared/pagination/pagination.types';
import { User } from './user.entity';

export interface UserRepository {
  findAll(params: ListParams): Promise<Page<User>>;
  findById(id: string): Promise<User | null>;
  findByUsername(username: string): Promise<User | null>;
  exists(id: string): Promise<boolean>;
  create(user: User): Promise<User>;
  update(user: User): Promise<User>;
  delete(id: string): Promise<boolean>;
  reserveLoginAttempt(username: string, now: Date, windowMs: number): Promise<User | null>;
  lockAccount(id: string, until: Date): Promise<void>;
  clearLoginFailures(id: string): Promise<void>;
}

import { Page } from '../../../shared/pagination/pagination.types';
import { NewOrder, Order, OrderStatus } from './order.entity';

export interface OrderListParams {
  page: number;
  pageSize: number;
  status?: OrderStatus;
}

export interface OrderRepository {
  create(order: NewOrder): Promise<Order>;
  findByUser(userId: string, params: OrderListParams): Promise<Page<Order>>;
  findById(id: string): Promise<Order | null>;
  updatePending(id: string, changes: { status?: OrderStatus; notes?: string }): Promise<Order | null>;
  delete(id: string): Promise<boolean>;
  existsByUser(userId: string): Promise<boolean>;
  existsByProduct(productId: string): Promise<boolean>;
}

import { CategorySummary } from '../../category/domain/category.entity';

export const ORDER_STATUSES = ['pending', 'completed', 'cancelled'] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export interface OrderUser {
  id: string;
  name: string;
  username: string;
}

export interface OrderItemProduct {
  id: string;
  name: string;
  price: number;
  isActive: boolean;
  category: CategorySummary | null;
}

export interface OrderItem {
  product: OrderItemProduct | null;
  productId: string;
  productName: string;
  unitPrice: number;
  quantity: number;
  subtotal: number;
}

export interface Order {
  id: string;
  user: OrderUser | null;
  userId: string;
  items: OrderItem[];
  total: number;
  status: OrderStatus;
  notes: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface NewOrderItem {
  productId: string;
  productName: string;
  unitPrice: number;
  quantity: number;
  subtotal: number;
}

export interface NewOrder {
  userId: string;
  items: NewOrderItem[];
  total: number;
  notes: string;
}

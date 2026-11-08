import { Order } from '../../domain/order.entity';

export const presentOrder = ({ userId: _userId, items, ...order }: Order) => ({
  ...order,
  items: items.map(({ productId: _productId, ...item }) => item),
});

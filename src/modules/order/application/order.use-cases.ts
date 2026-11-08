import { definedOnly } from '../../../shared/utils/defined';
import { AppError } from '../../../shared/errors/AppError';
import { Page } from '../../../shared/pagination/pagination.types';
import { ProductRepository } from '../../product/domain/product.repository';
import { UserRepository } from '../../user/domain/user.repository';
import { fromCents, toCents } from '../domain/money';
import { NewOrderItem, Order } from '../domain/order.entity';
import { OrderListParams, OrderRepository } from '../domain/order.repository';
import { CreateOrderDto, UpdateOrderDto } from './order.dto';

const sameId = (a: string, b: string): boolean => a.toLowerCase() === b.toLowerCase();

export class CreateOrderUseCase {
  constructor(
    private readonly orderRepository: OrderRepository,
    private readonly productRepository: ProductRepository,
  ) {}

  async execute(userId: string, input: CreateOrderDto): Promise<Order> {
    const ids = input.items.map((item) => item.product.id.toLowerCase());
    if (new Set(ids).size !== ids.length) {
      throw new AppError('No repitas productos en la orden; ajusta la cantidad (quantity) del producto', 400);
    }

    const products = new Map((await this.productRepository.findByIds(ids)).map((product) => [product.id, product]));

    const missing = ids.filter((id) => !products.has(id));
    if (missing.length > 0) {
      throw new AppError(`Productos inexistentes: ${missing.join(', ')}`, 400);
    }

    const inactive = ids.filter((id) => !products.get(id)!.isActive);
    if (inactive.length > 0) {
      throw new AppError(`Productos no disponibles: ${inactive.join(', ')}`, 409);
    }

    let totalCents = 0;
    const items: NewOrderItem[] = input.items.map((item) => {
      const product = products.get(item.product.id.toLowerCase())!;
      const subtotalCents = toCents(product.price) * item.quantity;
      totalCents += subtotalCents;
      return {
        productId: product.id,
        productName: product.name,
        unitPrice: product.price,
        quantity: item.quantity,
        subtotal: fromCents(subtotalCents),
      };
    });

    return this.orderRepository.create({
      userId,
      items,
      total: fromCents(totalCents),
      notes: input.notes ?? '',
    });
  }
}

export class FindOrdersByUserUseCase {
  constructor(
    private readonly orderRepository: OrderRepository,
    private readonly userRepository: UserRepository,
  ) {}

  async execute(userId: string, requesterId: string, params: OrderListParams): Promise<Page<Order>> {
    if (!sameId(userId, requesterId)) {
      throw new AppError('Solo puedes consultar tus propias órdenes', 403);
    }
    if (!(await this.userRepository.exists(userId))) {
      throw new AppError('Usuario no encontrado', 404);
    }
    return this.orderRepository.findByUser(userId, params);
  }
}

export class FindOrderByIdUseCase {
  constructor(private readonly orderRepository: OrderRepository) {}

  async execute(id: string, requesterId: string): Promise<Order> {
    const order = await this.orderRepository.findById(id);
    if (!order || !sameId(order.userId, requesterId)) {
      throw new AppError('Orden no encontrada', 404);
    }
    return order;
  }
}

export class UpdateOrderUseCase {
  constructor(private readonly orderRepository: OrderRepository) {}

  async execute(id: string, requesterId: string, input: UpdateOrderDto): Promise<Order> {
    if (input.status === undefined && input.notes === undefined) {
      throw new AppError('Debes enviar al menos un campo para actualizar (status o notes)', 400);
    }

    const order = await this.orderRepository.findById(id);
    if (!order || !sameId(order.userId, requesterId)) {
      throw new AppError('Orden no encontrada', 404);
    }

    const updated = await this.orderRepository.updatePending(id, definedOnly(input));
    if (!updated) {
      throw new AppError(`Solo se pueden modificar órdenes pendientes (estado actual: ${order.status})`, 409);
    }
    return updated;
  }
}

export class DeleteOrderUseCase {
  constructor(private readonly orderRepository: OrderRepository) {}

  async execute(id: string, requesterId: string): Promise<void> {
    const order = await this.orderRepository.findById(id);
    if (!order || !sameId(order.userId, requesterId)) {
      throw new AppError('Orden no encontrada', 404);
    }
    if (order.status === 'completed') {
      throw new AppError('No se puede eliminar una orden completada', 409);
    }
    await this.orderRepository.delete(id);
  }
}

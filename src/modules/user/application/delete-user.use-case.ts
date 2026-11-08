import { AppError } from '../../../shared/errors/AppError';
import { OrderRepository } from '../../order/domain/order.repository';
import { UserRepository } from '../domain/user.repository';

export class DeleteUserUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly orderRepository: OrderRepository,
  ) {}

  async execute(id: string, requesterId: string): Promise<void> {
    if (id.toLowerCase() !== requesterId.toLowerCase()) {
      throw new AppError('Solo puedes eliminar tu propio usuario', 403);
    }

    if (!(await this.userRepository.exists(id))) {
      throw new AppError('Usuario no encontrado', 404);
    }

    if (await this.orderRepository.existsByUser(id)) {
      throw new AppError('No puedes eliminar tu usuario mientras tenga órdenes asociadas', 409);
    }

    await this.userRepository.delete(id);
  }
}

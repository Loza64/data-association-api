import { AppError } from '../../../shared/errors/AppError';
import { User } from '../domain/user.entity';
import { UserRepository } from '../domain/user.repository';

export class FindUserByIdUseCase {
  constructor(private readonly userRepository: UserRepository) {}

  async execute(id: string): Promise<User> {
    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new AppError('Usuario no encontrado', 404);
    }
    return user;
  }
}

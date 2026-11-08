import { AppError } from '../../../shared/errors/AppError';
import { User } from '../domain/user.entity';
import { UserRepository } from '../domain/user.repository';
import { UpdateUserDto } from './update-user.dto';

export class UpdateUserUseCase {
  constructor(private readonly userRepository: UserRepository) {}

  async execute(id: string, requesterId: string, input: UpdateUserDto): Promise<User> {
    if (id.toLowerCase() !== requesterId.toLowerCase()) {
      throw new AppError('Solo puedes modificar tu propio usuario', 403);
    }
    if (input.name === undefined && input.username === undefined) {
      throw new AppError('Debes enviar al menos un campo para actualizar (name o username)', 400);
    }

    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new AppError('Usuario no encontrado', 404);
    }

    if (input.username !== undefined && input.username !== user.username) {
      const owner = await this.userRepository.findByUsername(input.username);
      if (owner && owner.id !== user.id) {
        throw new AppError('El nombre de usuario ya está en uso', 409);
      }
    }

    if (input.name !== undefined) user.name = input.name;
    if (input.username !== undefined) user.username = input.username;

    return this.userRepository.update(user);
  }
}

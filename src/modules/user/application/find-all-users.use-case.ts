import { ListParams, Page } from '../../../shared/pagination/pagination.types';
import { User } from '../domain/user.entity';
import { UserRepository } from '../domain/user.repository';

export class FindAllUsersUseCase {
  constructor(private readonly userRepository: UserRepository) {}

  execute(params: ListParams): Promise<Page<User>> {
    return this.userRepository.findAll(params);
  }
}

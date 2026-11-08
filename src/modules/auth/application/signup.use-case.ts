import { AppError } from '../../../shared/errors/AppError';
import { authLog } from '../../../shared/logger/logger';
import { User } from '../../user/domain/user.entity';
import { UserRepository } from '../../user/domain/user.repository';
import { PasswordHasher } from '../domain/password-hasher';
import { PasswordPolicy } from '../domain/password-policy';
import { SignupDto } from './signup.dto';

export class SignupUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly passwordHasher: PasswordHasher,
    private readonly passwordPolicy: PasswordPolicy,
  ) {}

  async execute(input: SignupDto): Promise<User> {
    if (await this.userRepository.findByUsername(input.username)) {
      throw new AppError('El nombre de usuario ya está en uso', 409);
    }

    await this.passwordPolicy.assertAcceptable(input.password, { username: input.username, name: input.name });

    const user = new User();
    user.name = input.name;
    user.username = input.username;
    user.password = await this.passwordHasher.hash(input.password);

    const created = await this.userRepository.create(user);
    authLog('User registered: userId=%s', created.id);
    return created;
  }
}

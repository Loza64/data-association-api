import { AppError } from '../../../shared/errors/AppError';
import { User } from '../../user/domain/user.entity';
import { TokenService } from '../domain/token-service';
import { CredentialVerifier } from './credential-verifier';
import { LoginDto } from './login.dto';

export interface LoginResult {
  user: User;
  accessToken: string;
  expiresIn: number;
}

export class LoginUseCase {
  constructor(
    private readonly credentialVerifier: CredentialVerifier,
    private readonly tokenService: TokenService,
  ) {}

  async execute(input: LoginDto): Promise<LoginResult> {
    const user = await this.credentialVerifier.verify(input.username, input.password);
    if (!user) {
      throw new AppError('Credenciales inválidas', 401);
    }

    const { token, expiresIn } = this.tokenService.issue({ userId: user.id });

    return { user, accessToken: token, expiresIn };
  }
}

import { authLog } from '../../../shared/logger/logger';
import { User } from '../../user/domain/user.entity';
import { UserRepository } from '../../user/domain/user.repository';
import { PasswordHasher } from '../domain/password-hasher';

export interface CredentialVerifierOptions {
  maxAttempts: number;
  lockoutSeconds: number;
  now?: () => Date;
}

export class CredentialVerifier {
  private readonly maxAttempts: number;
  private readonly lockoutMs: number;
  private readonly now: () => Date;
  private dummyHash?: Promise<string>;

  constructor(
    private readonly userRepository: UserRepository,
    private readonly passwordHasher: PasswordHasher,
    { maxAttempts, lockoutSeconds, now = () => new Date() }: CredentialVerifierOptions,
  ) {
    this.maxAttempts = maxAttempts;
    this.lockoutMs = lockoutSeconds * 1000;
    this.now = now;
  }

  async verify(username: string, password: string): Promise<User | null> {
    const now = this.now();
    const user = await this.userRepository.reserveLoginAttempt(username, now, this.lockoutMs);
    const allowed = user !== null && user.failedLoginAttempts <= this.maxAttempts;

    const storedHash = allowed ? user.password : await this.getDummyHash();
    const matches = await this.passwordHasher.compare(password, storedHash);

    if (!allowed) {
      authLog('Authentication denied: %s', user ? `userId=${user.id} too many attempts` : 'unknown or locked account');
      return null;
    }

    if (!matches) {
      authLog('Authentication failed: userId=%s attempt=%d/%d', user.id, user.failedLoginAttempts, this.maxAttempts);
      if (user.failedLoginAttempts >= this.maxAttempts) {
        await this.userRepository.lockAccount(user.id, new Date(now.getTime() + this.lockoutMs));
        authLog('Account locked: userId=%s for %ds', user.id, this.lockoutMs / 1000);
      }
      return null;
    }

    await this.userRepository.clearLoginFailures(user.id);
    return user;
  }

  private getDummyHash(): Promise<string> {
    this.dummyHash ??= this.passwordHasher.hash('dummy-password-used-to-equalize-timing');
    return this.dummyHash;
  }
}

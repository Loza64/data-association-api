import { InMemoryUserRepository } from '../../../testing/in-memory.repositories';
import { User } from '../../user/domain/user.entity';
import { PasswordHasher } from '../domain/password-hasher';
import { CredentialVerifier } from './credential-verifier';

class FakeHasher implements PasswordHasher {
  compareCalls: string[] = [];

  async hash(plain: string): Promise<string> {
    return `hashed:${plain}`;
  }

  async compare(plain: string, hash: string): Promise<boolean> {
    this.compareCalls.push(hash);
    return hash === `hashed:${plain}`;
  }
}

describe('CredentialVerifier (lockout, with an in-memory repository)', () => {
  const GOOD = 'a correct passphrase 123';
  let repository: InMemoryUserRepository;
  let hasher: FakeHasher;
  let clock: Date;
  let verifier: CredentialVerifier;
  let userId: string;

  beforeEach(async () => {
    repository = new InMemoryUserRepository();
    hasher = new FakeHasher();
    clock = new Date('2026-11-01T12:00:00Z');
    verifier = new CredentialVerifier(repository, hasher, { maxAttempts: 3, lockoutSeconds: 900, now: () => clock });

    const user = Object.assign(new User(), { name: 'Ana Lopez', username: 'ana', password: `hashed:${GOOD}` });
    userId = (await repository.create(user)).id;
  });

  const advance = (seconds: number) => {
    clock = new Date(clock.getTime() + seconds * 1000);
  };

  it('returns the user when the credentials are valid', async () => {
    const user = await verifier.verify('ana', GOOD);

    expect(user).toMatchObject({ id: userId, username: 'ana' });
  });

  it('returns null for a wrong password and for an unknown user', async () => {
    await expect(verifier.verify('ana', 'wrong')).resolves.toBeNull();
    await expect(verifier.verify('nadie', GOOD)).resolves.toBeNull();
  });

  it('always runs one hash comparison, so the unknown user path takes as long as the real one', async () => {
    await verifier.verify('ana', 'wrong');
    await verifier.verify('nadie', 'wrong');

    expect(hasher.compareCalls).toHaveLength(2);
    expect(hasher.compareCalls[1]).toBe('hashed:dummy-password-used-to-equalize-timing');
  });

  it('locks the account after the maximum number of failures, even for the right password', async () => {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      await expect(verifier.verify('ana', 'wrong')).resolves.toBeNull();
    }

    expect(repository.lockedUntilOf(userId)).toEqual(new Date('2026-11-01T12:15:00Z'));
    await expect(verifier.verify('ana', GOOD)).resolves.toBeNull();
  });

  it('does not compare against the real hash while locked', async () => {
    for (let attempt = 0; attempt < 3; attempt += 1) await verifier.verify('ana', 'wrong');
    hasher.compareCalls = [];

    await verifier.verify('ana', GOOD);

    expect(hasher.compareCalls).toEqual(['hashed:dummy-password-used-to-equalize-timing']);
  });

  it('allows a new attempt when the lock expires', async () => {
    for (let attempt = 0; attempt < 3; attempt += 1) await verifier.verify('ana', 'wrong');

    advance(899);
    await expect(verifier.verify('ana', GOOD)).resolves.toBeNull();

    advance(2);
    await expect(verifier.verify('ana', GOOD)).resolves.toMatchObject({ id: userId });
  });

  it('a successful login clears the failure counter', async () => {
    await verifier.verify('ana', 'wrong');
    await verifier.verify('ana', 'wrong');
    await expect(verifier.verify('ana', GOOD)).resolves.not.toBeNull();

    await verifier.verify('ana', 'wrong');
    await verifier.verify('ana', 'wrong');
    await expect(verifier.verify('ana', GOOD)).resolves.not.toBeNull();
    expect(repository.lockedUntilOf(userId)).toBeNull();
  });

  it('forgets old failures after the observation window', async () => {
    await verifier.verify('ana', 'wrong');
    await verifier.verify('ana', 'wrong');

    advance(901);
    await verifier.verify('ana', 'wrong');
    await verifier.verify('ana', 'wrong');

    expect(repository.lockedUntilOf(userId)).toBeNull();
    await expect(verifier.verify('ana', GOOD)).resolves.not.toBeNull();
  });

  it('a burst of parallel guesses verifies at most maxAttempts passwords', async () => {
    const results = await Promise.all(Array.from({ length: 40 }, (_, index) => verifier.verify('ana', `guess-${index}`)));

    const realComparisons = hasher.compareCalls.filter((hash) => hash === `hashed:${GOOD}`);
    expect(results.every((result) => result === null)).toBe(true);
    expect(realComparisons).toHaveLength(3);
    expect(repository.lockedUntilOf(userId)).not.toBeNull();
  });

  it('even the right password cannot sneak in once a burst used up the attempts', async () => {
    const burst = Array.from({ length: 10 }, (_, index) => verifier.verify('ana', `guess-${index}`));
    const attempt = verifier.verify('ana', GOOD);

    const [, ...rest] = await Promise.all([Promise.all(burst), attempt]);

    expect(rest[0]).toBeNull();
  });
});

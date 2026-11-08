import { User } from './user.entity';

describe('User', () => {
  it('only exposes the public fields', () => {
    const user = Object.assign(new User(), {
      id: 'u1',
      name: 'Ana Lopez',
      username: 'ana',
      password: 'scrypt$16$8$2$salt$hash',
      failedLoginAttempts: 2,
    });

    const publicUser = user.toPublic();

    expect(Object.keys(publicUser).sort()).toEqual(['createdAt', 'id', 'name', 'updatedAt', 'username']);
    expect(JSON.stringify(publicUser)).not.toContain('scrypt');
  });
});

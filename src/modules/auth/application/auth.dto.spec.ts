import 'reflect-metadata';
import { ClassConstructor, plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { LoginDto } from './login.dto';
import { SignupDto } from './signup.dto';

const check = <T extends object>(dto: ClassConstructor<T>, body: unknown) =>
  validate(plainToInstance(dto, body), { whitelist: true, forbidNonWhitelisted: true });

const PASSWORD = 'una frase larga para entrar 2026';

describe('auth DTOs', () => {
  const valid = { name: 'Ana Lopez', username: 'ana.lopez', password: PASSWORD };

  describe('SignupDto', () => {
    it('accepts a valid signup and normalizes name and username', async () => {
      expect(await check(SignupDto, valid)).toHaveLength(0);

      const dto = plainToInstance(SignupDto, { ...valid, name: '  Ana Lopez ', username: '  Ana.LOPEZ ' });
      expect(dto).toMatchObject({ name: 'Ana Lopez', username: 'ana.lopez' });
    });

    it('does not touch the password: spaces, unicode and case are kept as typed', () => {
      const typed = '  Ñandú azul   lluvia 😀 tormenta  ';

      expect(plainToInstance(SignupDto, { ...valid, password: typed }).password).toBe(typed);
    });

    it.each([
      ['a passphrase with spaces', 'el perro de mi vecino ladra'],
      ['only lowercase letters, no digits', 'alllowercaselettersonly'],
      ['only digits, long', '48201937560281947'],
      ['unicode', 'ñandú azul lluvia tormenta'],
      ['emoji counted as one character each', '😀'.repeat(15)],
      ['exactly the minimum length', 'a1b2c3d4e5f6g7h'],
      ['the maximum length', 'x'.repeat(128)],
    ])('accepts a password with %s', async (_label, password) => {
      expect(await check(SignupDto, { ...valid, password })).toHaveLength(0);
    });

    it.each([
      ['a password below the minimum', { ...valid, password: 'short-pass-1' }],
      ['14 characters', { ...valid, password: 'abcdefghijklmn' }],
      ['emoji that only look long', { ...valid, password: '😀'.repeat(14) }],
      ['a password above the maximum', { ...valid, password: 'x'.repeat(129) }],
      ['a numeric password', { ...valid, password: 123456789012345 }],
      ['a missing password', { name: 'Ana Lopez', username: 'ana' }],
      ['username too short', { ...valid, username: 'ab' }],
      ['username too long', { ...valid, username: 'a'.repeat(31) }],
      ['username with spaces', { ...valid, username: 'ana lopez' }],
      ['username with symbols', { ...valid, username: 'ana@lopez' }],
      ['name too short', { ...valid, name: 'A' }],
      ['an unknown field (mass assignment)', { ...valid, role: 'admin' }],
      ['an unknown field (id)', { ...valid, id: 'x' }],
    ])('rejects %s', async (_label, body) => {
      expect((await check(SignupDto, body)).length).toBeGreaterThan(0);
    });
  });

  describe('LoginDto', () => {
    it('accepts credentials and normalizes the username', async () => {
      expect(await check(LoginDto, { username: 'ana', password: 'x' })).toHaveLength(0);
      expect(plainToInstance(LoginDto, { username: ' ANA ', password: 'x' }).username).toBe('ana');
    });

    it.each([
      ['empty password', { username: 'ana', password: '' }],
      ['password over the maximum', { username: 'ana', password: 'x'.repeat(129) }],
      ['empty username', { username: '', password: 'x' }],
      ['username too long', { username: 'a'.repeat(31), password: 'x' }],
      ['an email field', { email: 'ana@example.com', password: 'x' }],
    ])('rejects %s', async (_label, body) => {
      expect((await check(LoginDto, body)).length).toBeGreaterThan(0);
    });
  });
});

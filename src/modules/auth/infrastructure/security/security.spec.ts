import jwt from 'jsonwebtoken';
import { ScryptPasswordHasher } from './scrypt-password-hasher';
import { JwtTokenService } from './jwt-token.service';

const SECRET = 'a-secret-that-is-long-enough-for-tests-1234';

describe('ScryptPasswordHasher', () => {
  const hasher = new ScryptPasswordHasher(10);

  it('produces a salted, self-describing hash and never the plain password', async () => {
    const first = await hasher.hash('una contraseña bastante larga');
    const second = await hasher.hash('una contraseña bastante larga');

    expect(first).toMatch(/^scrypt\$10\$8\$2\$[A-Za-z0-9+/=]+\$[A-Za-z0-9+/=]+$/);
    expect(first).not.toContain('contraseña');
    expect(first).not.toBe(second);
  });

  it('verifies the right password and rejects the wrong one', async () => {
    const hash = await hasher.hash('correct horse battery staple');

    await expect(hasher.compare('correct horse battery staple', hash)).resolves.toBe(true);
    await expect(hasher.compare('correct horse battery stapl', hash)).resolves.toBe(false);
    await expect(hasher.compare('Correct horse battery staple', hash)).resolves.toBe(false);
    await expect(hasher.compare('', hash)).resolves.toBe(false);
  });

  it('keeps whitespace and every character: no trimming, no truncation', async () => {
    const long = 'x'.repeat(100);
    const hash = await hasher.hash(` ${long} `);

    await expect(hasher.compare(` ${long} `, hash)).resolves.toBe(true);
    await expect(hasher.compare(long, hash)).resolves.toBe(false);
    await expect(hasher.compare(` ${long.slice(0, 80)} `, hash)).resolves.toBe(false);
  });

  it('distinguishes passwords that differ only after the 72nd byte, unlike bcrypt', async () => {
    const base = 'á'.repeat(60);
    const hash = await hasher.hash(`${base}1`);

    await expect(hasher.compare(`${base}1`, hash)).resolves.toBe(true);
    await expect(hasher.compare(`${base}2`, hash)).resolves.toBe(false);
  });

  it('treats canonically equivalent unicode as the same password (NFKC)', async () => {
    const hash = await hasher.hash('cafe\u0301 con leche y pan');

    await expect(hasher.compare('caf\u00e9 con leche y pan', hash)).resolves.toBe(true);
  });

  it('reads the cost from the stored hash, so old hashes keep working after a change', async () => {
    const hash = await new ScryptPasswordHasher(11).hash('clave de prueba larga');

    await expect(hasher.compare('clave de prueba larga', hash)).resolves.toBe(true);
  });

  it.each([
    ['empty', ''],
    ['other scheme', '$2b$12$abcdefghijklmnopqrstuuabcdefghijklmnopqrstuvwxyz0123'],
    ['missing parts', 'scrypt$10$8$2$c2FsdA=='],
    ['extra parts', 'scrypt$10$8$2$c2FsdA==$a2V5$extra'],
    ['non numeric cost', 'scrypt$x$8$2$c2FsdA==$a2V5'],
    ['cost too low', 'scrypt$1$8$2$c2FsdA==$a2V5'],
    ['cost absurdly high (memory abuse)', 'scrypt$30$8$2$c2FsdA==$a2V5'],
    ['parallelism absurdly high', 'scrypt$10$8$999$c2FsdA==$a2V5'],
  ])('returns false, without throwing, for a malformed stored hash: %s', async (_label, stored) => {
    await expect(hasher.compare('whatever', stored)).resolves.toBe(false);
  });

  it('returns false for a tampered hash', async () => {
    const hash = await hasher.hash('correct horse battery staple');
    const tampered = `${hash.slice(0, -4)}AAAA`;

    await expect(hasher.compare('correct horse battery staple', tampered)).resolves.toBe(false);
  });
});

describe('JwtTokenService', () => {
  const service = new JwtTokenService(SECRET, 3600);

  it('issues a token that verifies back to the user id and token version', () => {
    const { token, expiresIn } = service.issue({ userId: 'u1' });

    expect(expiresIn).toBe(3600);
    expect(service.verify(token)).toEqual({ userId: 'u1' });
  });

  it('401 for a token signed with another secret', () => {
    const forged = new JwtTokenService('another-secret-another-secret-12345', 3600).issue({ userId: 'u1' }).token;

    expect(() => service.verify(forged)).toThrow(expect.objectContaining({ statusCode: 401 }));
  });

  it('401 for tampered, malformed or empty tokens', () => {
    const { token } = service.issue({ userId: 'u1' });

    expect(() => service.verify(`${token}x`)).toThrow(expect.objectContaining({ statusCode: 401 }));
    expect(() => service.verify('not-a-token')).toThrow(expect.objectContaining({ statusCode: 401 }));
    expect(() => service.verify('')).toThrow(expect.objectContaining({ statusCode: 401 }));
  });

  it('401 for an expired token', () => {
    const expired = jwt.sign({ ver: 0 }, SECRET, { subject: 'u1', algorithm: 'HS256', expiresIn: -10 });

    expect(() => service.verify(expired)).toThrow(expect.objectContaining({ statusCode: 401, message: 'El token ha expirado' }));
  });

  it('401 for the "none" algorithm and for other signing algorithms', () => {
    const unsigned = jwt.sign({ sub: 'u1', ver: 0 }, '', { algorithm: 'none' });
    const hs512 = jwt.sign({ ver: 0 }, SECRET, { subject: 'u1', algorithm: 'HS512' });

    expect(() => service.verify(unsigned)).toThrow(expect.objectContaining({ statusCode: 401 }));
    expect(() => service.verify(hs512)).toThrow(expect.objectContaining({ statusCode: 401 }));
  });

  it('401 when the token has no subject', () => {
    const noSubject = jwt.sign({}, SECRET, { algorithm: 'HS256' });

    expect(() => service.verify(noSubject)).toThrow(expect.objectContaining({ statusCode: 401 }));
  });
});

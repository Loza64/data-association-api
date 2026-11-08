import { randomBytes, scrypt, timingSafeEqual } from 'crypto';
import { promisify } from 'util';
import { PasswordHasher } from '../../domain/password-hasher';

type ScryptFn = (
  password: string,
  salt: Buffer,
  keylen: number,
  options: { N: number; r: number; p: number; maxmem: number },
) => Promise<Buffer>;

const deriveKey = promisify(scrypt) as unknown as ScryptFn;

const KEY_LENGTH = 32;
const SALT_LENGTH = 16;
const BLOCK_SIZE = 8;
const PARALLELISM = 2;
const MIN_LOG_N = 4;
const MAX_LOG_N = 22;
const MAX_BLOCK_SIZE = 16;
const MAX_PARALLELISM = 16;

interface ScryptParams {
  logN: number;
  r: number;
  p: number;
}

interface ParsedHash extends ScryptParams {
  salt: Buffer;
  key: Buffer;
}

const derive = (password: string, salt: Buffer, { logN, r, p }: ScryptParams): Promise<Buffer> => {
  const N = 2 ** logN;
  return deriveKey(password.normalize('NFKC'), salt, KEY_LENGTH, { N, r, p, maxmem: 256 * N * r });
};

const parse = (stored: string): ParsedHash | null => {
  const [scheme, logN, r, p, salt, key, ...rest] = stored.split('$');
  if (scheme !== 'scrypt' || rest.length > 0 || !salt || !key) return null;

  const params = { logN: Number(logN), r: Number(r), p: Number(p) };
  const valid =
    Number.isInteger(params.logN) && params.logN >= MIN_LOG_N && params.logN <= MAX_LOG_N &&
    Number.isInteger(params.r) && params.r >= 1 && params.r <= MAX_BLOCK_SIZE &&
    Number.isInteger(params.p) && params.p >= 1 && params.p <= MAX_PARALLELISM;
  if (!valid) return null;

  const saltBytes = Buffer.from(salt, 'base64');
  const keyBytes = Buffer.from(key, 'base64');
  return saltBytes.length > 0 && keyBytes.length > 0 ? { ...params, salt: saltBytes, key: keyBytes } : null;
};

export class ScryptPasswordHasher implements PasswordHasher {
  constructor(private readonly logN: number) {}

  async hash(plain: string): Promise<string> {
    const params = { logN: this.logN, r: BLOCK_SIZE, p: PARALLELISM };
    const salt = randomBytes(SALT_LENGTH);
    const key = await derive(plain, salt, params);

    return ['scrypt', params.logN, params.r, params.p, salt.toString('base64'), key.toString('base64')].join('$');
  }

  async compare(plain: string, stored: string): Promise<boolean> {
    const parsed = parse(stored);
    if (!parsed) return false;

    const key = await derive(plain, parsed.salt, parsed);
    return key.length === parsed.key.length && timingSafeEqual(key, parsed.key);
  }
}

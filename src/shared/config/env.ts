import { config } from 'dotenv';

config();

const numberFrom = (value: string | undefined, fallback: number): number => {
  if (value === undefined || value.trim() === '') return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const booleanFrom = (value: string | undefined, fallback: boolean): boolean => {
  if (value === undefined || value.trim() === '') return fallback;
  return ['true', '1', 'yes'].includes(value.trim().toLowerCase());
};

const trustProxyFrom = (value: string | undefined): boolean | number | string | undefined => {
  if (value === undefined || value.trim() === '') return undefined;
  const text = value.trim();
  if (text.toLowerCase() === 'true') return true;
  if (text.toLowerCase() === 'false') return false;
  return Number.isInteger(Number(text)) ? Number(text) : text;
};

export const env = {
  PORT: numberFrom(process.env.PORT, 4400),
  ORIGIN: process.env.ORIGIN,
  NODE_ENV: process.env.NODE_ENV ?? 'development',
  isDev: (process.env.NODE_ENV ?? 'development') === 'development',
  MONGO_URI: process.env.MONGO_URI ?? 'mongodb://localhost:27017/association_db',
  JWT_SECRET: process.env.JWT_SECRET ?? '',
  JWT_EXPIRES_IN_SECONDS: numberFrom(process.env.JWT_EXPIRES_IN_SECONDS, 3600),
  PASSWORD_MIN_LENGTH: numberFrom(process.env.PASSWORD_MIN_LENGTH, 6),
  PWNED_PASSWORDS_CHECK: booleanFrom(process.env.PWNED_PASSWORDS_CHECK, true),
  SCRYPT_LOG_N: numberFrom(process.env.SCRYPT_LOG_N, 16),
  LOGIN_MAX_ATTEMPTS: numberFrom(process.env.LOGIN_MAX_ATTEMPTS, 5),
  LOGIN_LOCKOUT_SECONDS: numberFrom(process.env.LOGIN_LOCKOUT_SECONDS, 900),
  AUTH_RATE_LIMIT_MAX: numberFrom(process.env.AUTH_RATE_LIMIT_MAX, 30),
  TRUST_PROXY: trustProxyFrom(process.env.TRUST_PROXY),
};

export const assertEnv = (): void => {
  const problems: string[] = [];

  if (env.JWT_SECRET.length < 32) problems.push('JWT_SECRET es obligatorio y debe tener al menos 32 caracteres');
  
  if (!Number.isInteger(env.JWT_EXPIRES_IN_SECONDS) || env.JWT_EXPIRES_IN_SECONDS < 1) {
    problems.push('JWT_EXPIRES_IN_SECONDS debe ser un entero positivo');
  }
  if (!Number.isInteger(env.PASSWORD_MIN_LENGTH) || env.PASSWORD_MIN_LENGTH < 5 || env.PASSWORD_MIN_LENGTH > 128) {
    problems.push('PASSWORD_MIN_LENGTH debe ser un entero entre 5 y 128');
  }
  if (!Number.isInteger(env.SCRYPT_LOG_N) || env.SCRYPT_LOG_N < 16 || env.SCRYPT_LOG_N > 20) {
    problems.push('SCRYPT_LOG_N debe ser un entero entre 16 y 20');
  }
  if (!Number.isInteger(env.LOGIN_MAX_ATTEMPTS) || env.LOGIN_MAX_ATTEMPTS < 1 || env.LOGIN_MAX_ATTEMPTS > 100) {
    problems.push('LOGIN_MAX_ATTEMPTS debe ser un entero entre 1 y 100');
  }
  if (!Number.isInteger(env.LOGIN_LOCKOUT_SECONDS) || env.LOGIN_LOCKOUT_SECONDS < 1) {
    problems.push('LOGIN_LOCKOUT_SECONDS debe ser un entero positivo');
  }
  if (!Number.isInteger(env.AUTH_RATE_LIMIT_MAX) || env.AUTH_RATE_LIMIT_MAX < 1) {
    problems.push('AUTH_RATE_LIMIT_MAX debe ser un entero positivo');
  }

  if (problems.length > 0) {
    throw new Error(`Configuración inválida:\n- ${problems.join('\n- ')}`);
  }
};

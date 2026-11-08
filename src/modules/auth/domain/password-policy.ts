import { AppError } from '../../../shared/errors/AppError';
import { BreachedPasswordChecker } from './breached-password-checker';
import { COMMON_PASSWORDS } from './common-passwords';

export interface PasswordContext {
  username: string;
  name: string;
}

const KEYBOARD_ROWS = ['qwertyuiop', 'asdfghjkl', 'zxcvbnm', '1234567890'];

const isRepeatedPattern = (value: string): boolean => {
  for (let period = 1; period <= 4; period += 1) {
    if (value.length >= period * 2 && value === value.slice(0, period).repeat(Math.ceil(value.length / period)).slice(0, value.length)) {
      return true;
    }
  }
  return false;
};

const isSequence = (value: string): boolean => {
  const codes = [...value].map((char) => char.codePointAt(0) ?? 0);
  const steps = codes.slice(1).map((code, index) => code - codes[index]);
  if (steps.every((step) => step === 1) || steps.every((step) => step === -1)) return true;

  if (/^\d+$/.test(value)) {
    const digits = [...value].map(Number);
    const cyclic = digits.slice(1).map((digit, index) => (digit - digits[index] + 10) % 10);
    return cyclic.every((step) => step === 1) || cyclic.every((step) => step === 9);
  }
  return false;
};

const isKeyboardRun = (value: string): boolean =>
  KEYBOARD_ROWS.some((row) => row.includes(value) || [...row].reverse().join('').includes(value));

export const isPredictable = (value: string): boolean =>
  value.length > 0 && (isRepeatedPattern(value) || isSequence(value) || isKeyboardRun(value));

const containsPersonalData = (password: string, { username, name }: PasswordContext): boolean => {
  const user = username.normalize('NFKC').toLowerCase();
  if (user.length >= 3 && password.includes(user)) return true;

  return name
    .normalize('NFKC')
    .toLowerCase()
    .split(/\s+/)
    .some((part) => part.length >= 4 && password.includes(part));
};

export class PasswordPolicy {
  constructor(private readonly breachedPasswordChecker?: BreachedPasswordChecker) {}

  async assertAcceptable(password: string, context: PasswordContext): Promise<void> {
    const comparable = password.normalize('NFKC').toLowerCase();

    if (COMMON_PASSWORDS.has(comparable) || isPredictable(comparable)) {
      throw new AppError('La contraseña es demasiado común o predecible', 400);
    }
    if (containsPersonalData(comparable, context)) {
      throw new AppError('La contraseña no debe contener tu nombre de usuario ni tu nombre', 400);
    }
    if (this.breachedPasswordChecker && (await this.breachedPasswordChecker.isBreached(password))) {
      throw new AppError('Esa contraseña aparece en filtraciones de datos conocidas; elige otra', 400);
    }
  }
}

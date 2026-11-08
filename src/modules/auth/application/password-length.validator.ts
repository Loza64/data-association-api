import { registerDecorator, ValidationOptions } from 'class-validator';
import { codePointLength } from '../domain/password-rules';

export const IsPasswordLength =
  (min: number, max: number, options?: ValidationOptions) =>
  (object: object, propertyName: string): void => {
    registerDecorator({
      name: 'isPasswordLength',
      target: object.constructor,
      propertyName,
      options: { message: `${propertyName} debe tener entre ${min} y ${max} caracteres`, ...options },
      validator: {
        validate: (value: unknown) => typeof value === 'string' && codePointLength(value) >= min && codePointLength(value) <= max,
      },
    });
  };

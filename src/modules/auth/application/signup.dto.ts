import { Transform } from 'class-transformer';
import { IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { env } from '../../../shared/config/env';
import { PASSWORD_MAX_LENGTH } from '../domain/password-rules';
import { IsPasswordLength } from './password-length.validator';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);
const normalizeUsername = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim().toLowerCase() : value;

export class SignupDto {
  @Transform(trim)
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name!: string;

  @Transform(normalizeUsername)
  @IsString()
  @MinLength(3)
  @MaxLength(30)
  @Matches(/^[a-z0-9._-]+$/, {
    message: 'username solo puede contener letras, números, punto, guion y guion bajo',
  })
  username!: string;

  @IsPasswordLength(env.PASSWORD_MIN_LENGTH, PASSWORD_MAX_LENGTH)
  password!: string;
}

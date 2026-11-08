import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { PASSWORD_MAX_LENGTH } from '../domain/password-rules';
import { IsPasswordLength } from './password-length.validator';

const normalizeUsername = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim().toLowerCase() : value;

export class LoginDto {
  @Transform(normalizeUsername)
  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  username!: string;

  @IsPasswordLength(1, PASSWORD_MAX_LENGTH)
  password!: string;
}

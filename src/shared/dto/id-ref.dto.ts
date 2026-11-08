import { IsMongoId } from 'class-validator';

export class IdRefDto {
  @IsMongoId()
  id!: string;
}

import { IsObject, IsOptional, IsBoolean, IsString } from 'class-validator';

export class UpdateUserDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsObject()
  @IsOptional()
  role?: { dev: boolean; cs: boolean };

  @IsBoolean()
  @IsOptional()
  admin?: boolean;

  @IsObject()
  @IsOptional()
  write?: { dev: boolean; cs: boolean };
}

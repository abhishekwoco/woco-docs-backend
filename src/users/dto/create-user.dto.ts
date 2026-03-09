import { IsEmail, IsNotEmpty, IsObject, IsOptional, IsBoolean, IsString } from 'class-validator';

export class CreateUserDto {
  @IsString()
  @IsOptional()
  name: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  password: string;

  @IsObject()
  @IsOptional()
  role: { dev: boolean; cs: boolean };

  @IsBoolean()
  @IsOptional()
  admin: boolean;

  @IsObject()
  @IsOptional()
  write?: { dev: boolean; cs: boolean };
}

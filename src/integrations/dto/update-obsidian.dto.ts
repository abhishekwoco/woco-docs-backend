import { IsBoolean, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateObsidianDto {
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  baseUrl: string;

  /** API key — optional on update. Omit (or send empty) to keep the existing key. */
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  apiKey?: string;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}

import { IsString, IsOptional } from 'class-validator';

export class IngestUploadDto {
  @IsString()
  persona: string; // "cs" | "dev"

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  instructions?: string; // optional processing hints
}

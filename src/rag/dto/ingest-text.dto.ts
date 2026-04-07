import { IsString, IsOptional, MaxLength } from 'class-validator';

export class IngestTextDto {
  @IsString()
  @MaxLength(50000)
  text: string;

  @IsString()
  persona: string;

  @IsOptional()
  @IsString()
  category?: string;
}

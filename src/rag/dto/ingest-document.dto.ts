import { IsString, IsOptional } from 'class-validator';

export class IngestDocumentDto {
  @IsOptional()
  @IsString()
  category?: string; // override category if needed
}

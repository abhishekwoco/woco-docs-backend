import { IsString, IsOptional, IsBoolean, IsNumber, IsArray, IsObject, IsMongoId, Min } from 'class-validator';

export class UpdateDocumentDto {
  @IsMongoId()
  document_id: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsString()
  slug?: string;

  @IsOptional()
  @IsMongoId()
  categoryId?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;

  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  order?: number;

  @IsOptional()
  @IsObject()
  metadata?: {
    author?: string;
    version?: string;
    [key: string]: any;
  };
}

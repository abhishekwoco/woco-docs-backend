import { IsString, IsOptional, IsEnum, IsNumber, IsBoolean, IsObject, IsMongoId, Min } from 'class-validator';

export class UpdateCategoryDto {
  @IsMongoId()
  category_id: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  slug?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(['cs', 'dev'])
  persona?: 'cs' | 'dev';

  @IsOptional()
  @IsMongoId()
  parentId?: string | null;

  @IsOptional()
  @IsNumber()
  @Min(1)
  order?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsObject()
  metadata?: {
    icon?: string;
    color?: string;
    [key: string]: any;
  };
}

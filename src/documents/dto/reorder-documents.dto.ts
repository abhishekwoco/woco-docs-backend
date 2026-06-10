import { IsArray, IsMongoId, IsNumber, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class ReorderItemDto {
  @IsMongoId()
  id: string;

  @IsNumber()
  order: number;
}

export class ReorderDocumentsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReorderItemDto)
  documents: ReorderItemDto[];
}

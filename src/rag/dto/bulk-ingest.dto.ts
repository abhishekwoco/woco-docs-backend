import { IsArray, IsString } from 'class-validator';

export class BulkIngestDto {
  @IsArray()
  @IsString({ each: true })
  documentIds: string[];
}

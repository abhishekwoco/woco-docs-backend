import { IsMongoId } from 'class-validator';

export class DeleteDocumentDto {
  @IsMongoId()
  document_id: string;
}

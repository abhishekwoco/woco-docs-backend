import { IsString, IsOptional, MaxLength } from 'class-validator';

export class CreateChatSessionDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  title?: string;
}

export class SendMessageDto {
  @IsOptional()
  @IsString()
  session_id?: string;

  @IsString()
  @MaxLength(5000)
  message: string;

  @IsOptional()
  @IsString()
  client_schema?: string;
}

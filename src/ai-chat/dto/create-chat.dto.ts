import { IsString, IsOptional } from 'class-validator';

export class CreateChatSessionDto {
  @IsOptional()
  @IsString()
  title?: string;
}

export class SendMessageDto {
  @IsOptional()
  @IsString()
  session_id?: string;

  @IsString()
  message: string;
}

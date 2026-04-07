import { IsString, IsOptional, MaxLength } from 'class-validator';

export class SendMessageDto {
  @IsOptional()
  @IsString()
  session_id?: string;

  @IsString()
  @MaxLength(5000)
  message: string;

  @IsOptional()
  @IsString()
  model?: string;
}

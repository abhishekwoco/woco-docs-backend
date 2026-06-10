import { IsString, IsOptional, MaxLength } from 'class-validator';

export class SendMessageDto {
  @IsOptional()
  @IsString()
  session_id?: string;

  @IsString()
  @MaxLength(5000)
  message: string;

  // Chat provider selection — forwarded to Orchestra.
  //   service: "ollama_cloud" | "ollama_local" | "claude"
  //   model:   model tag for that service
  @IsOptional()
  @IsString()
  service?: string;

  @IsOptional()
  @IsString()
  model?: string;
}

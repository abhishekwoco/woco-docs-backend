import { IsString, IsOptional, MaxLength } from 'class-validator';

export class SendMessageDto {
  @IsOptional()
  @IsString()
  session_id?: string;

  // Generous cap: this is a RAG assistant, so users routinely paste docs,
  // logs, and code blocks. 5000 (~1000 words) was rejecting those with an
  // opaque 400. The client enforces the same limit (see MAX_MESSAGE_LEN).
  @IsString()
  @MaxLength(50000)
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

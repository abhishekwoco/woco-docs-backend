import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type ChatSessionDocument = HydratedDocument<ChatSession>;

@Schema({ collection: 'doc-chat-sessions-v2', timestamps: true })
export class ChatSession {
  @Prop({ required: true })
  userId: string;

  @Prop({ default: 'New Chat' })
  title: string;

  @Prop({
    type: [{ role: String, content: String, timestamp: Date }],
    default: [],
  })
  messages: { role: string; content: string; timestamp: Date }[];

  @Prop({ default: true })
  isActive: boolean;

  /**
   * Agent scratchpad — structured facts the agent has resolved during this
   * conversation. Persisted across turns so context survives message truncation.
   *
   * Shape (all fields optional):
   *   resolved_company : { name: string; db: string }
   *   last_tables_used : string[]
   *   last_sql         : string
   *   confirmed_facts  : Record<string, any>   — e.g. { active_status_value: 1 }
   *   user_preferences : Record<string, any>   — e.g. { date_format: "DD/MM/YYYY" }
   */
  @Prop({ type: Object, default: {} })
  state: Record<string, any>;
}

export const ChatSessionSchema = SchemaFactory.createForClass(ChatSession);

ChatSessionSchema.index({ userId: 1, isActive: 1, updatedAt: -1 });

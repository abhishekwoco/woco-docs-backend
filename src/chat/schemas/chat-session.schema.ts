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
}

export const ChatSessionSchema = SchemaFactory.createForClass(ChatSession);

ChatSessionSchema.index({ userId: 1, isActive: 1, updatedAt: -1 });

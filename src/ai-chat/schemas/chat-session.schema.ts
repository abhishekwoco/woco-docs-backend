import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema } from 'mongoose';

export type ChatMessageDocument = HydratedDocument<ChatMessage>;

@Schema({ _id: false })
export class ChatMessage {
  @Prop({ type: String, enum: ['user', 'assistant'], required: true })
  role: string;

  @Prop({ required: true })
  content: string;

  @Prop({ type: [Object], default: [] })
  sources: Array<{
    documentId: string;
    title: string;
    slug: string;
    category: string;
    relevanceScore: number;
  }>;

  @Prop({ default: Date.now })
  timestamp: Date;
}

export const ChatMessageSchema = SchemaFactory.createForClass(ChatMessage);

// ---

export type ChatSessionDocument = HydratedDocument<ChatSession>;

@Schema({ collection: 'doc-chat-sessions', timestamps: true })
export class ChatSession {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  userId: string;

  @Prop({ default: 'New Chat' })
  title: string;

  @Prop({ type: String, enum: ['cs', 'dev'], required: true })
  persona: string;

  @Prop({ type: [ChatMessageSchema], default: [] })
  messages: ChatMessage[];

  @Prop({ default: true })
  isActive: boolean;
}

export const ChatSessionSchema = SchemaFactory.createForClass(ChatSession);

ChatSessionSchema.index({ userId: 1 });
ChatSessionSchema.index({ persona: 1 });

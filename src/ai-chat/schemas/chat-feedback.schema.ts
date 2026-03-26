import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema } from 'mongoose';

export type ChatFeedbackDocument = HydratedDocument<ChatFeedback>;

@Schema({ collection: 'doc-chat-feedback', timestamps: true })
export class ChatFeedback {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  userId: string;

  @Prop({ required: true })
  sessionId: string;

  @Prop({ required: true })
  query: string;

  @Prop({ required: true })
  response: string;

  @Prop({ type: String, enum: ['casual', 'data', 'docs'], required: true })
  intent: string;

  @Prop({ type: String, enum: ['good', 'bad'], required: true })
  rating: string;

  @Prop({ default: '' })
  feedback: string;

  @Prop({ default: 'ollama' })
  model: string;
}

export const ChatFeedbackSchema = SchemaFactory.createForClass(ChatFeedback);

ChatFeedbackSchema.index({ userId: 1 });
ChatFeedbackSchema.index({ rating: 1 });
ChatFeedbackSchema.index({ createdAt: -1 });

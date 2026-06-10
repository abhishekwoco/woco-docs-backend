import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type ChatFeedbackDocument = HydratedDocument<ChatFeedback>;

/**
 * One thumbs-up / thumbs-down vote on an assistant answer.
 *
 * The question/answer text is snapshotted verbatim at vote time — feedback
 * must stay reviewable even if the session is later deleted or compressed.
 * This collection is the system's accuracy ground truth: every 👎 is a
 * documented failure case (fodder for the eval golden set / experience
 * store), every 👍 is a candidate for auto-verifying experience entries.
 */
@Schema({ collection: 'doc-chat-feedback', timestamps: true })
export class ChatFeedback {
  @Prop({ required: true, type: Types.ObjectId, ref: 'User' })
  userId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'ChatSession' })
  sessionId?: Types.ObjectId;

  @Prop({ required: true, enum: ['up', 'down'] })
  rating: string;

  @Prop({ required: true })
  question: string;

  @Prop({ required: true })
  answer: string;

  @Prop({ default: '' })
  comment: string;
}

export const ChatFeedbackSchema = SchemaFactory.createForClass(ChatFeedback);

// Admin review feed sorts newest-first
ChatFeedbackSchema.index({ createdAt: -1 });
ChatFeedbackSchema.index({ rating: 1, createdAt: -1 });

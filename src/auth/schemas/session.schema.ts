import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type SessionDocument = HydratedDocument<Session>;

@Schema({ collection: 'doc-users-auth', timestamps: true })
export class Session {
  @Prop({ required: true, type: Types.ObjectId, ref: 'User' })
  userId: Types.ObjectId;

  @Prop({ required: true })
  token: string;

  @Prop({ required: true, type: Date, expires: 0 })
  expiresAt: Date;
}

export const SessionSchema = SchemaFactory.createForClass(Session);

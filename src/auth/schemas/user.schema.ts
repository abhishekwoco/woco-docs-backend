import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type UserDocument = HydratedDocument<User>;

@Schema({ collection: 'doc-users', timestamps: true })
export class User {
  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ required: true })
  password: string;

  @Prop()
  name: string;

  @Prop({ type: { dev: Boolean, cs: Boolean }, default: { dev: false, cs: false } })
  role: { dev: boolean; cs: boolean };

  @Prop({ default: '0' })
  admin: string;
}

export const UserSchema = SchemaFactory.createForClass(User);

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type AppSettingDocument = HydratedDocument<AppSetting>;

/**
 * Generic key/value store for admin-editable runtime settings that shouldn't
 * require an env change + redeploy (e.g. the pinned reformat model).
 */
@Schema({ collection: 'app-settings', timestamps: true })
export class AppSetting {
  @Prop({ required: true, unique: true })
  key: string;

  @Prop({ type: String, default: '' })
  value: string;
}

export const AppSettingSchema = SchemaFactory.createForClass(AppSetting);

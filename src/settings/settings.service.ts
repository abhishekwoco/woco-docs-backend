import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AppSetting, AppSettingDocument } from './schemas/app-setting.schema';

/** Setting keys used across the app. */
export const REFORMAT_MODEL_KEY = 'reformat_model';

@Injectable()
export class SettingsService {
  constructor(
    @InjectModel(AppSetting.name)
    private readonly model: Model<AppSettingDocument>,
  ) {}

  async get(key: string): Promise<string | null> {
    const doc = await this.model.findOne({ key }).exec();
    return doc?.value ?? null;
  }

  async set(key: string, value: string): Promise<void> {
    await this.model
      .updateOne({ key }, { $set: { value } }, { upsert: true })
      .exec();
  }
}

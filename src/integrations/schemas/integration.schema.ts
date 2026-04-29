import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import type { EncryptedValue } from '../../common/crypto.util';

export type IntegrationDocument = HydratedDocument<Integration>;

/**
 * Generic key/value store for third-party integration configs.
 *
 * One document per integration type (unique by `type`).  Non-sensitive
 * config lives in `config`; encrypted secrets live in `secrets`.
 *
 * Example document:
 *   {
 *     type: "obsidian",
 *     enabled: true,
 *     config: { baseUrl: "https://host:27124" },
 *     secrets: { apiKey: { iv, tag, ciphertext } },
 *   }
 */
@Schema({ collection: 'doc-integrations', timestamps: true })
export class Integration {
  @Prop({ required: true, unique: true })
  type: string;   // "obsidian" | future: "slack" | "notion" | ...

  @Prop({ default: true })
  enabled: boolean;

  @Prop({ type: Object, default: {} })
  config: Record<string, unknown>;

  @Prop({ type: Object, default: {} })
  secrets: Record<string, EncryptedValue>;

  @Prop({ type: String })
  updatedBy?: string;   // userId of the admin who last saved
}

export const IntegrationSchema = SchemaFactory.createForClass(Integration);

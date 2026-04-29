import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Integration, IntegrationDocument } from './schemas/integration.schema';
import { UpdateObsidianDto } from './dto/update-obsidian.dto';
import { decrypt, encrypt, isEncryptedValue } from '../common/crypto.util';

const OBSIDIAN_TYPE = 'obsidian';


export interface ObsidianPublicConfig {
  type:       string;
  enabled:    boolean;
  baseUrl:    string;
  hasApiKey:  boolean;
  updatedAt?: Date;
  updatedBy?: string;
}

export interface ObsidianResolvedCreds {
  enabled: boolean;
  baseUrl: string;
  apiKey:  string;
}


@Injectable()
export class IntegrationsService {
  private readonly logger = new Logger(IntegrationsService.name);

  constructor(
    @InjectModel(Integration.name)
    private readonly model: Model<IntegrationDocument>,
  ) {}

  // ── Obsidian ───────────────────────────────────────────────────────────────

  async getObsidian(): Promise<ObsidianPublicConfig | null> {
    const doc = await this.model.findOne({ type: OBSIDIAN_TYPE }).lean().exec();
    if (!doc) return null;
    return {
      type:      doc.type,
      enabled:   !!doc.enabled,
      baseUrl:   (doc.config?.baseUrl as string) ?? '',
      hasApiKey: isEncryptedValue(doc.secrets?.apiKey),
      updatedAt: (doc as any).updatedAt,
      updatedBy: doc.updatedBy,
    };
  }

  async upsertObsidian(
    dto: UpdateObsidianDto,
    userId?: string,
  ): Promise<ObsidianPublicConfig> {
    const existing = await this.model.findOne({ type: OBSIDIAN_TYPE }).exec();

    const update: any = {
      type:    OBSIDIAN_TYPE,
      enabled: dto.enabled ?? (existing?.enabled ?? true),
      config:  { baseUrl: dto.baseUrl },
      updatedBy: userId,
    };

    // Only re-encrypt when a new key is actually provided
    if (dto.apiKey && dto.apiKey.trim().length > 0) {
      update.secrets = { apiKey: encrypt(dto.apiKey.trim()) };
    } else if (existing?.secrets?.apiKey) {
      // Keep existing encrypted value
      update.secrets = { apiKey: existing.secrets.apiKey };
    } else {
      update.secrets = {};
    }

    await this.model.updateOne(
      { type: OBSIDIAN_TYPE },
      { $set: update },
      { upsert: true },
    );

    const saved = await this.getObsidian();
    if (!saved) throw new Error('Failed to save Obsidian integration');
    this.logger.log(
      `Obsidian integration saved — enabled=${saved.enabled} hasApiKey=${saved.hasApiKey}`,
    );
    return saved;
  }

  async deleteObsidian(): Promise<void> {
    const result = await this.model.deleteOne({ type: OBSIDIAN_TYPE }).exec();
    if (result.deletedCount === 0) {
      throw new NotFoundException('Obsidian integration not configured');
    }
    this.logger.log('Obsidian integration deleted');
  }

  /**
   * Decrypts and returns Obsidian credentials for internal use (e.g. monitoring
   * service forwarding to Orchestra).  Returns null if not configured or disabled.
   */
  async resolveObsidianCredentials(): Promise<ObsidianResolvedCreds | null> {
    const doc = await this.model.findOne({ type: OBSIDIAN_TYPE }).lean().exec();
    if (!doc || !doc.enabled) return null;

    const baseUrl = (doc.config?.baseUrl as string) ?? '';
    const keyEnc  = doc.secrets?.apiKey;
    if (!baseUrl || !isEncryptedValue(keyEnc)) return null;

    try {
      return {
        enabled: true,
        baseUrl,
        apiKey: decrypt(keyEnc),
      };
    } catch (err) {
      this.logger.error(`Failed to decrypt Obsidian apiKey: ${err}`);
      return null;
    }
  }
}

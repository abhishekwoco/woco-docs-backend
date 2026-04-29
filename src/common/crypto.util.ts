/**
 * AES-256-GCM helpers for encrypting sensitive config (API keys, tokens).
 *
 * Uses the ENCRYPTION_KEY env var — a 32-byte key expressed as 64 hex chars.
 * Generate one with:  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
 *
 * Storage format: { iv, tag, ciphertext } all hex-encoded. Each encryption
 * uses a fresh random IV so the same plaintext produces different ciphertext.
 */

import * as crypto from 'crypto';
import { Logger } from '@nestjs/common';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // GCM standard

export interface EncryptedValue {
  iv: string;          // hex
  tag: string;         // hex (auth tag)
  ciphertext: string;  // hex
}

const logger = new Logger('CryptoUtil');


function getKey(): Buffer {
  const hex = process.env.ENCRYPTION_KEY;
  if (!hex) {
    throw new Error('ENCRYPTION_KEY env var is not set');
  }
  if (hex.length !== 64) {
    throw new Error(
      `ENCRYPTION_KEY must be 64 hex chars (32 bytes); got ${hex.length} chars`,
    );
  }
  return Buffer.from(hex, 'hex');
}


export function encrypt(plaintext: string): EncryptedValue {
  const key    = getKey();
  const iv     = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  return {
    iv:         iv.toString('hex'),
    tag:        tag.toString('hex'),
    ciphertext: encrypted.toString('hex'),
  };
}


export function decrypt(value: EncryptedValue): string {
  if (!value || !value.iv || !value.tag || !value.ciphertext) {
    throw new Error('Invalid encrypted value — missing iv/tag/ciphertext');
  }

  const key      = getKey();
  const iv       = Buffer.from(value.iv, 'hex');
  const tag      = Buffer.from(value.tag, 'hex');
  const cipherBuf = Buffer.from(value.ciphertext, 'hex');

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  try {
    const decrypted = Buffer.concat([
      decipher.update(cipherBuf),
      decipher.final(),
    ]);
    return decrypted.toString('utf8');
  } catch (err) {
    logger.error(`Decryption failed — key rotation or tampering: ${err}`);
    throw new Error('Failed to decrypt value — ENCRYPTION_KEY may have changed');
  }
}


/** Safe check used by controllers to decide whether to show "••••••••" vs empty. */
export function isEncryptedValue(v: unknown): v is EncryptedValue {
  return (
    !!v &&
    typeof v === 'object' &&
    typeof (v as EncryptedValue).iv === 'string' &&
    typeof (v as EncryptedValue).tag === 'string' &&
    typeof (v as EncryptedValue).ciphertext === 'string'
  );
}

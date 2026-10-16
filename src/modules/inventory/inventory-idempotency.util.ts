import crypto from 'crypto';
import mongoose from 'mongoose';
import { IdempotencyRecordModel } from '../shared/idempotency-record.model';

export class InventoryIdempotencyUtil {
  static computeHash(data: unknown): string {
    const serialized = JSON.stringify(data ?? {});
    return crypto.createHash('sha256').update(serialized).digest('hex');
  }

  static async findRecord(key: string, endpoint: string) {
    if (!key) return null;
    return IdempotencyRecordModel.findOne({
      idempotencyKey: key.trim(),
      endpoint,
    });
  }

  static async recordResponse(
    key: string,
    endpoint: string,
    requestHash: string,
    responseStatus: number,
    responseBody: unknown,
    session?: mongoose.ClientSession,
  ) {
    if (!key) return null;
    try {
      const options = { ...(session ? { session } : {}) };
      return await IdempotencyRecordModel.create(
        [
          {
            idempotencyKey: key.trim(),
            endpoint,
            requestHash,
            responseStatus,
            responseBody,
          },
        ],
        options,
      );
    } catch (err: unknown) {
      // If already recorded concurrently, ignore duplicate key error
      if (
        typeof err === 'object' &&
        err !== null &&
        'code' in err &&
        (err as { code: number }).code === 11000
      ) {
        return null;
      }
      throw err;
    }
  }
}

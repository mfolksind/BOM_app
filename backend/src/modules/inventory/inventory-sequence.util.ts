import mongoose from 'mongoose';
import { DocumentSequenceModel } from '../shared/document-sequence.model';

export class InventorySequenceUtil {
  /**
   * Determine Indian Fiscal Year (April 1 to March 31).
   * E.g. April 2026 -> "2026-27", Feb 2026 -> "2025-26".
   */
  static getFiscalYear(date: Date = new Date()): string {
    const year = date.getFullYear();
    const month = date.getMonth(); // 0-indexed: 0 = Jan, 3 = April
    if (month >= 3) {
      const nextYear = (year + 1).toString().slice(-2);
      return `${year}-${nextYear}`;
    } else {
      const prevYear = year - 1;
      const curYear = year.toString().slice(-2);
      return `${prevYear}-${curYear}`;
    }
  }

  /**
   * Atomically generate next sequential document number with optional session support.
   */
  static async getNextSequence(
    sequenceName: string,
    prefix: string,
    session?: mongoose.ClientSession,
    paddingLength = 4,
  ): Promise<string> {
    const fiscalYear = this.getFiscalYear();
    const options = {
      new: true,
      upsert: true,
      ...(session ? { session } : {}),
    };

    const seq = await DocumentSequenceModel.findOneAndUpdate(
      { sequenceName, fiscalYear },
      {
        $inc: { currentNumber: 1 },
        $setOnInsert: { prefix, paddingLength },
      },
      options,
    );

    const padLen = seq?.paddingLength || paddingLength;
    const numStr = String(seq?.currentNumber || 1).padStart(padLen, '0');
    return `${prefix}-${fiscalYear}-${numStr}`;
  }
}

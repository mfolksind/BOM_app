import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IIdempotencyRecord extends Document {
  idempotencyKey: string;
  endpoint: string;
  requestHash: string;
  responseStatus: number;
  responseBody: unknown;
  createdAt: Date;
}

const idempotencyRecordSchema = new Schema<IIdempotencyRecord>(
  {
    idempotencyKey: {
      type: String,
      required: [true, 'Idempotency key is required'],
      unique: true,
      trim: true,
    },
    endpoint: {
      type: String,
      required: [true, 'API endpoint path is required'],
      trim: true,
    },
    requestHash: {
      type: String,
      required: [true, 'Request payload hash is required'],
      trim: true,
    },
    responseStatus: {
      type: Number,
      required: true,
    },
    responseBody: {
      type: Schema.Types.Mixed,
    },
    createdAt: {
      type: Date,
      default: Date.now,
      expires: 86400, // 24 hours TTL index
    },
  },
  {
    timestamps: false,
  },
);

export const IdempotencyRecordModel: Model<IIdempotencyRecord> =
  mongoose.models.IdempotencyRecord ||
  mongoose.model<IIdempotencyRecord>('IdempotencyRecord', idempotencyRecordSchema);

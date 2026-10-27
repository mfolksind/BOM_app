import mongoose, { Schema, Document, Model } from 'mongoose';

export type BomStatus = 'DRAFT' | 'ACTIVE' | 'ARCHIVED' | 'SUPERSEDED';

export interface IBomVersion extends Document {
  bomNumber: string;
  productId: mongoose.Types.ObjectId;
  versionNumber: number;
  status: BomStatus;
  effectiveFrom: Date;
  effectiveTo?: Date;
  batchSize: number;
  outputUnit: string;
  approvedBy?: mongoose.Types.ObjectId;
  approvedAt?: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const bomVersionSchema = new Schema<IBomVersion>(
  {
    bomNumber: {
      type: String,
      required: [true, 'BOM number is required'],
      unique: true,
      trim: true,
      uppercase: true,
    },
    productId: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: [true, 'Product reference is required'],
    },
    versionNumber: {
      type: Number,
      required: [true, 'Version number is required'],
      min: [1, 'Version number must be at least 1'],
    },
    status: {
      type: String,
      required: true,
      enum: ['DRAFT', 'ACTIVE', 'ARCHIVED', 'SUPERSEDED'],
      default: 'DRAFT',
    },
    effectiveFrom: {
      type: Date,
      required: true,
      default: Date.now,
    },
    effectiveTo: {
      type: Date,
    },
    batchSize: {
      type: Number,
      required: [true, 'Batch size is required'],
      min: [1, 'Batch size must be greater than 0'],
      default: 1000, // Standard batch: 1000 meters
    },
    outputUnit: {
      type: String,
      required: true,
      default: 'METER',
    },
    approvedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    approvedAt: {
      type: Date,
    },
    notes: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  },
);

bomVersionSchema.index({ productId: 1, versionNumber: 1 }, { unique: true });
bomVersionSchema.index({ productId: 1, status: 1 });

export const BomVersionModel: Model<IBomVersion> =
  mongoose.models.BomVersion || mongoose.model<IBomVersion>('BomVersion', bomVersionSchema);

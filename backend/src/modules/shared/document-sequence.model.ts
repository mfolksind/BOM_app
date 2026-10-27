import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IDocumentSequence extends Document {
  sequenceName: string;
  prefix: string;
  currentNumber: number;
  fiscalYear: string;
  paddingLength: number;
  createdAt: Date;
  updatedAt: Date;
}

const documentSequenceSchema = new Schema<IDocumentSequence>(
  {
    sequenceName: {
      type: String,
      required: [true, 'Sequence name is required'],
      trim: true,
      uppercase: true,
    },
    prefix: {
      type: String,
      required: [true, 'Sequence prefix is required'],
      trim: true,
      uppercase: true,
    },
    currentNumber: {
      type: Number,
      required: true,
      default: 0,
      min: [0, 'Current number cannot be negative'],
    },
    fiscalYear: {
      type: String,
      required: [true, 'Fiscal year is required (e.g., 2026-27)'],
      trim: true,
    },
    paddingLength: {
      type: Number,
      default: 4,
      min: [1, 'Padding length must be at least 1'],
    },
  },
  {
    timestamps: true,
  },
);

documentSequenceSchema.index({ sequenceName: 1, fiscalYear: 1 }, { unique: true });

export const DocumentSequenceModel: Model<IDocumentSequence> =
  mongoose.models.DocumentSequence ||
  mongoose.model<IDocumentSequence>('DocumentSequence', documentSequenceSchema);

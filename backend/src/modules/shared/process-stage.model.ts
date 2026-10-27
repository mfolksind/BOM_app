import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IProcessStage extends Document {
  code: string;
  name: string;
  sequenceOrder: number;
  category?: string;
  description?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const processStageSchema = new Schema<IProcessStage>(
  {
    code: {
      type: String,
      required: [true, 'Process stage code is required'],
      unique: true,
      trim: true,
      uppercase: true,
    },
    name: {
      type: String,
      required: [true, 'Process stage name is required'],
      trim: true,
    },
    sequenceOrder: {
      type: Number,
      required: [true, 'Sequence order is required'],
      min: [1, 'Sequence order must be at least 1'],
    },
    category: {
      type: String,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  },
);

processStageSchema.index({ sequenceOrder: 1 });

export const ProcessStageModel: Model<IProcessStage> =
  mongoose.models.ProcessStage || mongoose.model<IProcessStage>('ProcessStage', processStageSchema);

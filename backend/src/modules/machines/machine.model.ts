import mongoose, { Schema, Document, Model } from 'mongoose';

export type MachineStatus = 'AVAILABLE' | 'RUNNING' | 'MAINTENANCE' | 'BREAKDOWN';

export interface IMachine extends Document {
  code: string;
  name: string;
  processStageIds: mongoose.Types.ObjectId[];
  machineType?: string;
  status: MachineStatus;
  currentBatchId?: mongoose.Types.ObjectId;
  capacityPerShift?: number;
  speedMetersPerMinute?: number;
  location?: string;
  specifications?: Record<string, unknown>;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const machineSchema = new Schema<IMachine>(
  {
    code: {
      type: String,
      required: [true, 'Machine code is required'],
      unique: true,
      trim: true,
      uppercase: true,
    },
    name: {
      type: String,
      required: [true, 'Machine name is required'],
      trim: true,
    },
    processStageIds: [
      {
        type: Schema.Types.ObjectId,
        ref: 'ProcessStage',
      },
    ],
    machineType: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ['AVAILABLE', 'RUNNING', 'MAINTENANCE', 'BREAKDOWN'],
      default: 'AVAILABLE',
    },
    currentBatchId: {
      type: Schema.Types.ObjectId,
      ref: 'ProductionBatch',
    },
    capacityPerShift: {
      type: Number,
      min: [0, 'Capacity cannot be negative'],
    },
    speedMetersPerMinute: {
      type: Number,
      min: [0, 'Speed cannot be negative'],
    },
    location: {
      type: String,
      trim: true,
    },
    specifications: {
      type: Schema.Types.Mixed,
      default: {},
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

machineSchema.index({ status: 1 });
machineSchema.index({ processStageIds: 1 });

export const MachineModel: Model<IMachine> =
  mongoose.models.Machine || mongoose.model<IMachine>('Machine', machineSchema);

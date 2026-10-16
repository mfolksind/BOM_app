import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IPackingListLine extends Document {
  packingListId: mongoose.Types.ObjectId;
  drumId: mongoose.Types.ObjectId;
  productId: mongoose.Types.ObjectId;
  lengthMeters: number;
  tareWeightKg: number;
  netWeightKg: number;
  grossWeightKg: number;
  conductorResistanceOhmPerKm?: number;
  insulationResistanceMOhmKm?: number;
  highVoltageTestPassed: boolean;
  remarks?: string;
  createdAt: Date;
  updatedAt: Date;
}

const packingListLineSchema = new Schema<IPackingListLine>(
  {
    packingListId: {
      type: Schema.Types.ObjectId,
      ref: 'PackingList',
      required: [true, 'Packing list reference is required'],
    },
    drumId: {
      type: Schema.Types.ObjectId,
      ref: 'Drum',
      required: [true, 'Drum reference is required'],
    },
    productId: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: [true, 'Product reference is required'],
    },
    lengthMeters: {
      type: Number,
      required: [true, 'Length in meters is required'],
      min: [0.000001, 'Length must be positive'],
    },
    tareWeightKg: {
      type: Number,
      required: [true, 'Tare weight is required'],
      min: [0.000001, 'Tare weight must be positive'],
    },
    netWeightKg: {
      type: Number,
      required: [true, 'Net weight is required'],
      min: [0.000001, 'Net weight must be positive'],
    },
    grossWeightKg: {
      type: Number,
      required: [true, 'Gross weight is required'],
      min: [0.000001, 'Gross weight must be positive'],
    },
    conductorResistanceOhmPerKm: {
      type: Number,
      min: [0, 'Conductor resistance cannot be negative'],
    },
    insulationResistanceMOhmKm: {
      type: Number,
      min: [0, 'Insulation resistance cannot be negative'],
    },
    highVoltageTestPassed: {
      type: Boolean,
      default: true,
    },
    remarks: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  },
);

packingListLineSchema.index({ packingListId: 1, drumId: 1 }, { unique: true });
packingListLineSchema.index({ drumId: 1 });

export const PackingListLineModel: Model<IPackingListLine> =
  mongoose.models.PackingListLine ||
  mongoose.model<IPackingListLine>('PackingListLine', packingListLineSchema);

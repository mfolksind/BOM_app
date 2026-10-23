import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IPackingListLine extends Document {
  packingListId: mongoose.Types.ObjectId;
  drumId: mongoose.Types.ObjectId;
  sNo?: number;
  drumNumber?: string;
  lengthBottom: number;
  lengthTop: number;
  lengthTotal: number;
  drumSize?: string;
  refRgpNumber?: string;
  drumType?: string;
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
    sNo: {
      type: Number,
      min: 1,
    },
    drumNumber: {
      type: String,
      trim: true,
    },
    lengthBottom: {
      type: Number,
      default: 0,
      min: 0,
    },
    lengthTop: {
      type: Number,
      default: 0,
      min: 0,
    },
    lengthTotal: {
      type: Number,
      default: 0,
      min: 0,
    },
    drumSize: {
      type: String,
      trim: true,
    },
    refRgpNumber: {
      type: String,
      trim: true,
    },
    drumType: {
      type: String,
      trim: true,
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
      default: 0,
      min: [0, 'Tare weight cannot be negative'],
    },
    netWeightKg: {
      type: Number,
      default: 0,
      min: [0, 'Net weight cannot be negative'],
    },
    grossWeightKg: {
      type: Number,
      default: 0,
      min: [0, 'Gross weight cannot be negative'],
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

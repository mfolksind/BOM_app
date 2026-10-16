import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IDispatchLine extends Document {
  dispatchId: mongoose.Types.ObjectId;
  packingListLineId?: mongoose.Types.ObjectId;
  drumId: mongoose.Types.ObjectId;
  productId: mongoose.Types.ObjectId;
  lengthMeters: number;
  tareWeightKg?: number;
  netWeightKg?: number;
  grossWeightKg: number;
  inventoryTransactionId?: mongoose.Types.ObjectId;
  remarks?: string;
  createdAt: Date;
  updatedAt: Date;
}

const dispatchLineSchema = new Schema<IDispatchLine>(
  {
    dispatchId: {
      type: Schema.Types.ObjectId,
      ref: 'Dispatch',
      required: [true, 'Dispatch reference is required'],
    },
    packingListLineId: {
      type: Schema.Types.ObjectId,
      ref: 'PackingListLine',
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
      required: [true, 'Dispatched length in meters is required'],
      min: [0.000001, 'Length must be positive'],
    },
    tareWeightKg: {
      type: Number,
      min: [0, 'Tare weight cannot be negative'],
    },
    netWeightKg: {
      type: Number,
      min: [0, 'Net weight cannot be negative'],
    },
    grossWeightKg: {
      type: Number,
      required: [true, 'Gross weight in kg is required'],
      min: [0.000001, 'Gross weight must be positive'],
    },
    inventoryTransactionId: {
      type: Schema.Types.ObjectId,
      ref: 'InventoryTransaction',
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

dispatchLineSchema.index({ dispatchId: 1, drumId: 1 }, { unique: true });
dispatchLineSchema.index({ drumId: 1 });

export const DispatchLineModel: Model<IDispatchLine> =
  mongoose.models.DispatchLine || mongoose.model<IDispatchLine>('DispatchLine', dispatchLineSchema);

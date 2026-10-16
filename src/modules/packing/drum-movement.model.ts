import mongoose, { Schema, Document, Model } from 'mongoose';

export type DrumMovementType =
  | 'CREATED'
  | 'ASSIGNED'
  | 'STAGE_TRANSFER'
  | 'PACKING'
  | 'STORAGE'
  | 'DISPATCH'
  | 'CUSTOMER_RETURN'
  | 'UNPACKED'
  | 'DAMAGED'
  | 'CANCELLED';

export interface IDrumMovement extends Document {
  movementNumber: string;
  drumId: mongoose.Types.ObjectId;
  movementType: DrumMovementType;
  fromWarehouseId?: mongoose.Types.ObjectId;
  toWarehouseId?: mongoose.Types.ObjectId;
  referenceDocumentType?: string;
  referenceDocumentId?: mongoose.Types.ObjectId;
  movedAt: Date;
  recordedBy?: mongoose.Types.ObjectId;
  remarks?: string;
  createdAt: Date;
  updatedAt: Date;
}

const drumMovementSchema = new Schema<IDrumMovement>(
  {
    movementNumber: {
      type: String,
      required: [true, 'Movement number is required'],
      unique: true,
      trim: true,
      uppercase: true,
    },
    drumId: {
      type: Schema.Types.ObjectId,
      ref: 'Drum',
      required: [true, 'Drum reference is required'],
    },
    movementType: {
      type: String,
      required: [true, 'Movement type is required'],
      enum: [
        'CREATED',
        'ASSIGNED',
        'STAGE_TRANSFER',
        'PACKING',
        'STORAGE',
        'DISPATCH',
        'CUSTOMER_RETURN',
        'UNPACKED',
        'DAMAGED',
        'CANCELLED',
      ],
    },
    fromWarehouseId: {
      type: Schema.Types.ObjectId,
      ref: 'Warehouse',
    },
    toWarehouseId: {
      type: Schema.Types.ObjectId,
      ref: 'Warehouse',
    },
    referenceDocumentType: {
      type: String,
      trim: true,
    },
    referenceDocumentId: {
      type: Schema.Types.ObjectId,
    },
    movedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    recordedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
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

drumMovementSchema.index({ drumId: 1, movedAt: -1 });
drumMovementSchema.index({ referenceDocumentId: 1 });

export const DrumMovementModel: Model<IDrumMovement> =
  mongoose.models.DrumMovement || mongoose.model<IDrumMovement>('DrumMovement', drumMovementSchema);

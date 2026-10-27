import mongoose, { Schema, Document, Model } from 'mongoose';

export type InboundLineQcStatus = 'PENDING_QC' | 'APPROVED' | 'REJECTED';

export interface IInboundChallanLine extends Document {
  inboundChallanId: mongoose.Types.ObjectId;
  materialId: mongoose.Types.ObjectId;
  declaredQuantity: number;
  receivedQuantity: number;
  unit: string;
  lotId?: mongoose.Types.ObjectId;
  supplierLotNumber?: string;
  qualityStatus: InboundLineQcStatus;
  remarks?: string;
  createdAt: Date;
  updatedAt: Date;
}

const inboundChallanLineSchema = new Schema<IInboundChallanLine>(
  {
    inboundChallanId: {
      type: Schema.Types.ObjectId,
      ref: 'InboundChallan',
      required: [true, 'Inbound Challan reference is required'],
    },
    materialId: {
      type: Schema.Types.ObjectId,
      ref: 'Material',
      required: [true, 'Material reference is required'],
    },
    declaredQuantity: {
      type: Number,
      required: [true, 'Declared quantity is required'],
      min: [0, 'Declared quantity cannot be negative'],
    },
    receivedQuantity: {
      type: Number,
      required: [true, 'Received quantity is required'],
      min: [0, 'Received quantity cannot be negative'],
    },
    unit: {
      type: String,
      required: true,
      trim: true,
    },
    lotId: {
      type: Schema.Types.ObjectId,
      ref: 'MaterialLot',
    },
    supplierLotNumber: {
      type: String,
      trim: true,
    },
    qualityStatus: {
      type: String,
      required: true,
      enum: ['PENDING_QC', 'APPROVED', 'REJECTED'],
      default: 'PENDING_QC',
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

inboundChallanLineSchema.index({ inboundChallanId: 1, materialId: 1 });
inboundChallanLineSchema.index({ lotId: 1 });

export const InboundChallanLineModel: Model<IInboundChallanLine> =
  mongoose.models.InboundChallanLine ||
  mongoose.model<IInboundChallanLine>('InboundChallanLine', inboundChallanLineSchema);

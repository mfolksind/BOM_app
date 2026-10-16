import mongoose, { Schema, Document, Model } from 'mongoose';

export type StockOwnerType = 'FACTORY' | 'CUSTOMER';
export type LotQualityStatus = 'PENDING_QC' | 'APPROVED' | 'REJECTED' | 'QUARANTINE';

export interface IMaterialLot extends Document {
  lotNumber: string;
  materialId: mongoose.Types.ObjectId;
  warehouseId?: mongoose.Types.ObjectId;
  ownerType: StockOwnerType;
  customerId?: mongoose.Types.ObjectId;
  inboundChallanId?: mongoose.Types.ObjectId;
  inboundChallanLineId?: mongoose.Types.ObjectId;
  supplierLotNumber?: string;
  initialQuantity: number;
  currentBalance: number;
  unit: string;
  receivedDate: Date;
  expiryDate?: Date;
  qualityStatus: LotQualityStatus;
  testReportNumber?: string;
  qcApprovedBy?: mongoose.Types.ObjectId;
  qcApprovedAt?: Date;
  remarks?: string;
  createdAt: Date;
  updatedAt: Date;
}

const materialLotSchema = new Schema<IMaterialLot>(
  {
    lotNumber: {
      type: String,
      required: [true, 'Lot number is required'],
      unique: true,
      trim: true,
      uppercase: true,
    },
    materialId: {
      type: Schema.Types.ObjectId,
      ref: 'Material',
      required: [true, 'Material reference is required'],
    },
    warehouseId: {
      type: Schema.Types.ObjectId,
      ref: 'Warehouse',
    },
    ownerType: {
      type: String,
      required: [true, 'Owner type is required (FACTORY or CUSTOMER)'],
      enum: ['FACTORY', 'CUSTOMER'],
      default: 'FACTORY',
    },
    customerId: {
      type: Schema.Types.ObjectId,
      ref: 'Customer',
      required: [
        function (this: IMaterialLot) {
          return this.ownerType === 'CUSTOMER';
        },
        'Customer ID is required when ownerType is CUSTOMER',
      ],
    },
    inboundChallanId: {
      type: Schema.Types.ObjectId,
      ref: 'InboundChallan',
    },
    inboundChallanLineId: {
      type: Schema.Types.ObjectId,
      ref: 'InboundChallanLine',
    },
    supplierLotNumber: {
      type: String,
      trim: true,
    },
    initialQuantity: {
      type: Number,
      required: [true, 'Initial quantity is required'],
      min: [0, 'Initial quantity cannot be negative'],
    },
    currentBalance: {
      type: Number,
      required: [true, 'Current balance is required'],
      min: [0, 'Current balance cannot be negative'],
    },
    unit: {
      type: String,
      required: true,
      trim: true,
    },
    receivedDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    expiryDate: {
      type: Date,
    },
    qualityStatus: {
      type: String,
      required: true,
      enum: ['PENDING_QC', 'APPROVED', 'REJECTED', 'QUARANTINE'],
      default: 'PENDING_QC',
    },
    testReportNumber: {
      type: String,
      trim: true,
    },
    qcApprovedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    qcApprovedAt: {
      type: Date,
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

materialLotSchema.index({ materialId: 1, qualityStatus: 1 });
materialLotSchema.index({ ownerType: 1, customerId: 1 });
materialLotSchema.index({ inboundChallanId: 1 });

export const MaterialLotModel: Model<IMaterialLot> =
  mongoose.models.MaterialLot || mongoose.model<IMaterialLot>('MaterialLot', materialLotSchema);

import mongoose, { Schema, Document } from 'mongoose';

export type ScrapChallanStatus = 'DRAFT' | 'ISSUED' | 'ACKNOWLEDGED' | 'CANCELLED';

export interface IScrapChallanItem {
  inboundChallanId?: mongoose.Types.ObjectId;
  inboundChallanNumber?: string;
  inboundChallanDate?: Date;
  lotId?: mongoose.Types.ObjectId;
  lotNumber?: string;
  workOrderId?: mongoose.Types.ObjectId;
  workOrderNumber?: string;
  materialId?: mongoose.Types.ObjectId;
  materialCode?: string;
  materialName: string;
  initialQuantity?: number;
  quantityAvailable?: number;
  scrapQuantity: number;
  unit: string;
  remarks?: string;
}

export interface IScrapChallan extends Document {
  challanNumber: string;
  challanDate: Date;
  customerId: mongoose.Types.ObjectId;
  inboundChallanIds?: mongoose.Types.ObjectId[];
  inboundChallanNumbers?: string[];
  workOrderIds?: mongoose.Types.ObjectId[];
  workOrderNumbers?: string[];
  vehicleNumber?: string;
  transporter?: string;
  lrNumber?: string;
  deliveryAddress?: string;
  placeOfSupply?: string;
  totalScrapQuantity: number;
  items: IScrapChallanItem[];
  status: ScrapChallanStatus;
  issuedBy?: mongoose.Types.ObjectId;
  consumptionSheet?: Record<string, any>;
  remarks?: string;
  createdAt: Date;
  updatedAt: Date;
}

const scrapChallanItemSchema = new Schema<IScrapChallanItem>(
  {
    inboundChallanId: {
      type: Schema.Types.ObjectId,
      ref: 'InboundChallan',
    },
    inboundChallanNumber: {
      type: String,
      trim: true,
    },
    inboundChallanDate: {
      type: Date,
    },
    lotId: {
      type: Schema.Types.ObjectId,
      ref: 'MaterialLot',
    },
    lotNumber: {
      type: String,
      trim: true,
    },
    workOrderId: {
      type: Schema.Types.ObjectId,
      ref: 'WorkOrder',
    },
    workOrderNumber: {
      type: String,
      trim: true,
    },
    materialId: {
      type: Schema.Types.ObjectId,
      ref: 'Material',
    },
    materialCode: {
      type: String,
      trim: true,
    },
    materialName: {
      type: String,
      required: true,
      trim: true,
    },
    initialQuantity: {
      type: Number,
      default: 0,
    },
    quantityAvailable: {
      type: Number,
      default: 0,
    },
    scrapQuantity: {
      type: Number,
      required: true,
      min: 0,
    },
    unit: {
      type: String,
      default: 'KGS',
      trim: true,
    },
    remarks: {
      type: String,
      trim: true,
    },
  },
  { _id: false },
);

const scrapChallanSchema = new Schema<IScrapChallan>(
  {
    challanNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    challanDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    customerId: {
      type: Schema.Types.ObjectId,
      ref: 'Customer',
      required: true,
      index: true,
    },
    inboundChallanIds: [
      {
        type: Schema.Types.ObjectId,
        ref: 'InboundChallan',
      },
    ],
    inboundChallanNumbers: [
      {
        type: String,
        trim: true,
      },
    ],
    workOrderIds: [
      {
        type: Schema.Types.ObjectId,
        ref: 'WorkOrder',
      },
    ],
    workOrderNumbers: [
      {
        type: String,
        trim: true,
      },
    ],
    vehicleNumber: {
      type: String,
      trim: true,
    },
    transporter: {
      type: String,
      trim: true,
    },
    lrNumber: {
      type: String,
      trim: true,
    },
    deliveryAddress: {
      type: String,
      trim: true,
    },
    placeOfSupply: {
      type: String,
      trim: true,
    },
    totalScrapQuantity: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    items: {
      type: [scrapChallanItemSchema],
      default: [],
    },
    status: {
      type: String,
      enum: ['DRAFT', 'ISSUED', 'ACKNOWLEDGED', 'CANCELLED'],
      default: 'ISSUED',
      index: true,
    },
    issuedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    consumptionSheet: {
      type: Schema.Types.Mixed,
      default: null,
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

export const ScrapChallanModel = mongoose.model<IScrapChallan>('ScrapChallan', scrapChallanSchema);

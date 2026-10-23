import mongoose, { Schema, Document, Model } from 'mongoose';

export type OutboundChallanStatus = 'DRAFT' | 'ISSUED' | 'ACKNOWLEDGED' | 'CANCELLED';

export interface IOutboundChallanItem {
  drumId: mongoose.Types.ObjectId;
  drumNumber: string;
  sNo?: number;
  productId: mongoose.Types.ObjectId;
  productCode: string;
  productName: string;
  sizeDescription?: string;
  lengthBottom?: number;
  lengthTop?: number;
  lengthMeters: number;
  drumSize?: string;
  refRgpNumber?: string;
  drumType?: string;
  tareWeightKg: number;
  netWeightKg: number;
  grossWeightKg: number;
  remarks?: string;
}

export interface IOutboundChallan extends Document {
  challanNumber: string;
  dispatchId?: mongoose.Types.ObjectId;
  packingListId?: mongoose.Types.ObjectId;
  packingListNumber?: string;
  invoiceNumber?: string;
  sizeDescription?: string;
  workOrderId: mongoose.Types.ObjectId;
  workOrderNumber?: string;
  customerId: mongoose.Types.ObjectId;
  challanDate: Date;
  deliveryTerms?: string;
  eWayBillNumber?: string;
  eWayBillDate?: Date;
  vehicleNumber?: string;
  transporter?: string;
  lrNumber?: string;
  deliveryAddress?: string;
  totalDrums: number;
  totalLengthMeters: number;
  totalNetWeightKg: number;
  totalTareWeightKg: number;
  totalGrossWeightKg: number;
  items: IOutboundChallanItem[];
  status: OutboundChallanStatus;
  issuedBy?: mongoose.Types.ObjectId;
  acknowledgedByCustomer: boolean;
  acknowledgedDate?: Date;
  remarks?: string;
  createdAt: Date;
  updatedAt: Date;
}

const outboundChallanItemSchema = new Schema<IOutboundChallanItem>(
  {
    drumId: {
      type: Schema.Types.ObjectId,
      ref: 'Drum',
      required: true,
    },
    drumNumber: {
      type: String,
      required: true,
    },
    sNo: {
      type: Number,
    },
    productId: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    productCode: {
      type: String,
      required: true,
    },
    productName: {
      type: String,
      required: true,
    },
    sizeDescription: {
      type: String,
      trim: true,
    },
    lengthBottom: {
      type: Number,
      default: 0,
    },
    lengthTop: {
      type: Number,
      default: 0,
    },
    lengthMeters: {
      type: Number,
      required: true,
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
    tareWeightKg: {
      type: Number,
      default: 0,
    },
    netWeightKg: {
      type: Number,
      default: 0,
    },
    grossWeightKg: {
      type: Number,
      default: 0,
    },
    remarks: {
      type: String,
    },
  },
  { _id: false },
);

const outboundChallanSchema = new Schema<IOutboundChallan>(
  {
    challanNumber: {
      type: String,
      required: [true, 'Challan number is required'],
      unique: true,
      trim: true,
      uppercase: true,
    },
    dispatchId: {
      type: Schema.Types.ObjectId,
      ref: 'Dispatch',
    },
    packingListId: {
      type: Schema.Types.ObjectId,
      ref: 'PackingList',
    },
    packingListNumber: {
      type: String,
      trim: true,
    },
    invoiceNumber: {
      type: String,
      trim: true,
    },
    sizeDescription: {
      type: String,
      trim: true,
    },
    workOrderId: {
      type: Schema.Types.ObjectId,
      ref: 'WorkOrder',
      required: [true, 'Work Order reference is required'],
    },
    workOrderNumber: {
      type: String,
      trim: true,
    },
    customerId: {
      type: Schema.Types.ObjectId,
      ref: 'Customer',
      required: [true, 'Customer reference is required'],
    },
    challanDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    deliveryTerms: {
      type: String,
      trim: true,
    },
    eWayBillNumber: {
      type: String,
      trim: true,
    },
    eWayBillDate: {
      type: Date,
    },
    vehicleNumber: {
      type: String,
      trim: true,
      uppercase: true,
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
    totalDrums: {
      type: Number,
      required: true,
      default: 0,
      min: [0, 'Total drums cannot be negative'],
    },
    totalLengthMeters: {
      type: Number,
      required: true,
      default: 0,
      min: [0, 'Total length cannot be negative'],
    },
    totalNetWeightKg: {
      type: Number,
      required: true,
      default: 0,
      min: [0, 'Total net weight cannot be negative'],
    },
    totalTareWeightKg: {
      type: Number,
      required: true,
      default: 0,
      min: [0, 'Total tare weight cannot be negative'],
    },
    totalGrossWeightKg: {
      type: Number,
      required: true,
      default: 0,
      min: [0, 'Total gross weight cannot be negative'],
    },
    items: {
      type: [outboundChallanItemSchema],
      default: [],
    },
    status: {
      type: String,
      required: true,
      enum: ['DRAFT', 'ISSUED', 'ACKNOWLEDGED', 'CANCELLED'],
      default: 'ISSUED',
    },
    issuedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    acknowledgedByCustomer: {
      type: Boolean,
      default: false,
    },
    acknowledgedDate: {
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

outboundChallanSchema.index({ customerId: 1, challanDate: -1 });
outboundChallanSchema.index({ dispatchId: 1 });
outboundChallanSchema.index({ workOrderId: 1 });

export const OutboundChallanModel: Model<IOutboundChallan> =
  mongoose.models.OutboundChallan ||
  mongoose.model<IOutboundChallan>('OutboundChallan', outboundChallanSchema);

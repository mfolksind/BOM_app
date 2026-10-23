import mongoose, { Schema, Document, Model } from 'mongoose';

export type DrumType = 'WOODEN' | 'STEEL' | 'PLASTIC';

export type DrumStatus =
  | 'EMPTY'
  | 'AVAILABLE'
  | 'WINDING'
  | 'FILLED'
  | 'PACKED'
  | 'IN_TRANSIT'
  | 'DISPATCHED'
  | 'CUSTOMER_SITE'
  | 'RETURNED'
  | 'DAMAGED'
  | 'SCRAPPED'
  | 'CANCELLED';

export type DrumOwnership = 'FACTORY_OWNED' | 'CUSTOMER_SUPPLIED';

export interface IDrum extends Document {
  drumNumber: string;
  drumType: DrumType;
  serialNumber?: string;
  flangeDiameterMm?: number;
  barrelDiameterMm?: number;
  traverseWidthMm?: number;
  tareWeightKg: number;
  grossWeightKg: number;
  netWeightKg: number;
  cableLengthMeters: number;
  currentProductId?: mongoose.Types.ObjectId;
  workOrderId?: mongoose.Types.ObjectId;
  productionOrderId?: mongoose.Types.ObjectId;
  productionBatchId?: mongoose.Types.ObjectId;
  productionOutputId?: mongoose.Types.ObjectId;
  status: DrumStatus;
  currentWarehouseId?: mongoose.Types.ObjectId;
  location?: string;
  ownership: DrumOwnership;
  customerId?: mongoose.Types.ObjectId;
  drumSize?: string;
  refRgpNumber?: string;
  inboundChallanId?: mongoose.Types.ObjectId;
  inboundChallanNumber?: string;
  receivedDate?: Date;
  packingListId?: mongoose.Types.ObjectId;
  dispatchId?: mongoose.Types.ObjectId;
  remarks?: string;
  createdAt: Date;
  updatedAt: Date;
}

const drumSchema = new Schema<IDrum>(
  {
    drumNumber: {
      type: String,
      required: [true, 'Drum number is required'],
      unique: true,
      trim: true,
      uppercase: true,
    },
    drumType: {
      type: String,
      required: [true, 'Drum type is required'],
      default: 'WOODEN',
    },
    serialNumber: {
      type: String,
      trim: true,
      uppercase: true,
    },
    flangeDiameterMm: {
      type: Number,
      min: [0, 'Flange diameter cannot be negative'],
    },
    barrelDiameterMm: {
      type: Number,
      min: [0, 'Barrel diameter cannot be negative'],
    },
    traverseWidthMm: {
      type: Number,
      min: [0, 'Traverse width cannot be negative'],
    },
    tareWeightKg: {
      type: Number,
      default: 0,
      min: [0, 'Tare weight cannot be negative'],
    },
    grossWeightKg: {
      type: Number,
      required: true,
      default: 0,
      min: [0, 'Gross weight cannot be negative'],
    },
    netWeightKg: {
      type: Number,
      required: true,
      default: 0,
      min: [0, 'Net weight cannot be negative'],
    },
    cableLengthMeters: {
      type: Number,
      required: true,
      default: 0,
      min: [0, 'Cable length cannot be negative'],
    },
    currentProductId: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
    },
    workOrderId: {
      type: Schema.Types.ObjectId,
      ref: 'WorkOrder',
    },
    productionOrderId: {
      type: Schema.Types.ObjectId,
      ref: 'ProductionOrder',
    },
    productionBatchId: {
      type: Schema.Types.ObjectId,
      ref: 'ProductionBatch',
    },
    productionOutputId: {
      type: Schema.Types.ObjectId,
      ref: 'ProductionOutput',
    },
    status: {
      type: String,
      required: true,
      enum: [
        'EMPTY',
        'AVAILABLE',
        'WINDING',
        'FILLED',
        'PACKED',
        'IN_TRANSIT',
        'DISPATCHED',
        'CUSTOMER_SITE',
        'RETURNED',
        'DAMAGED',
        'SCRAPPED',
        'CANCELLED',
      ],
      default: 'AVAILABLE',
    },
    currentWarehouseId: {
      type: Schema.Types.ObjectId,
      ref: 'Warehouse',
    },
    location: {
      type: String,
      trim: true,
    },
    ownership: {
      type: String,
      default: 'FACTORY_OWNED',
    },
    customerId: {
      type: Schema.Types.ObjectId,
      ref: 'Customer',
    },
    drumSize: {
      type: String,
      trim: true,
    },
    refRgpNumber: {
      type: String,
      trim: true,
    },
    inboundChallanId: {
      type: Schema.Types.ObjectId,
      ref: 'InboundChallan',
    },
    inboundChallanNumber: {
      type: String,
      trim: true,
    },
    receivedDate: {
      type: Date,
    },
    packingListId: {
      type: Schema.Types.ObjectId,
      ref: 'PackingList',
    },
    dispatchId: {
      type: Schema.Types.ObjectId,
      ref: 'Dispatch',
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

drumSchema.index({ status: 1, currentWarehouseId: 1 });
drumSchema.index({ currentProductId: 1 });
drumSchema.index({ workOrderId: 1, status: 1 });
drumSchema.index({ customerId: 1, status: 1 });
drumSchema.index({ packingListId: 1 });
drumSchema.index({ dispatchId: 1 });

export const DrumModel: Model<IDrum> =
  mongoose.models.Drum || mongoose.model<IDrum>('Drum', drumSchema);

import mongoose, { Schema, Document, Model } from 'mongoose';
import { StockOwnerType } from '../materials/material-lot.model';

export interface IInventoryBalance extends Document {
  materialId: mongoose.Types.ObjectId;
  warehouseId: mongoose.Types.ObjectId;
  ownerType: StockOwnerType;
  customerId?: mongoose.Types.ObjectId;
  lotId?: mongoose.Types.ObjectId;
  quantityOnHand: number;
  quantityReserved: number;
  quantityAvailable: number;
  unit: string;
  lastTransactionId?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const inventoryBalanceSchema = new Schema<IInventoryBalance>(
  {
    materialId: {
      type: Schema.Types.ObjectId,
      ref: 'Material',
      required: [true, 'Material reference is required'],
    },
    warehouseId: {
      type: Schema.Types.ObjectId,
      ref: 'Warehouse',
      required: [true, 'Warehouse reference is required'],
    },
    ownerType: {
      type: String,
      required: true,
      enum: ['FACTORY', 'CUSTOMER'],
      default: 'FACTORY',
    },
    customerId: {
      type: Schema.Types.ObjectId,
      ref: 'Customer',
      default: null,
    },
    lotId: {
      type: Schema.Types.ObjectId,
      ref: 'MaterialLot',
      default: null,
    },
    quantityOnHand: {
      type: Number,
      required: true,
      default: 0,
      min: [0, 'Quantity on hand cannot be negative'],
    },
    quantityReserved: {
      type: Number,
      required: true,
      default: 0,
      min: [0, 'Quantity reserved cannot be negative'],
    },
    quantityAvailable: {
      type: Number,
      required: true,
      default: 0,
      min: [0, 'Quantity available cannot be negative'],
    },
    unit: {
      type: String,
      required: true,
      trim: true,
    },
    lastTransactionId: {
      type: Schema.Types.ObjectId,
      ref: 'InventoryTransaction',
    },
  },
  {
    timestamps: true,
  },
);

// Pre-save hook to ensure available quantity matches onHand - reserved
inventoryBalanceSchema.pre('save', function (next) {
  this.quantityAvailable = Math.max(0, this.quantityOnHand - this.quantityReserved);
  next();
});

// Compound unique index ensuring segregated stock buckets
inventoryBalanceSchema.index(
  {
    materialId: 1,
    warehouseId: 1,
    ownerType: 1,
    customerId: 1,
    lotId: 1,
  },
  { unique: true },
);

inventoryBalanceSchema.index({ materialId: 1, warehouseId: 1 });
inventoryBalanceSchema.index({ ownerType: 1, customerId: 1 });

export const InventoryBalanceModel: Model<IInventoryBalance> =
  mongoose.models.InventoryBalance ||
  mongoose.model<IInventoryBalance>('InventoryBalance', inventoryBalanceSchema);

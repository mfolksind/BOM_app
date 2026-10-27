import mongoose, { Schema, Document, Model } from 'mongoose';
import { StockOwnerType } from '../materials/material-lot.model';

export interface IMaterialReorderRule extends Document {
  materialId: mongoose.Types.ObjectId;
  warehouseId?: mongoose.Types.ObjectId;
  ownerType: StockOwnerType;
  minStockLevel: number;
  maxStockLevel?: number;
  reorderPoint: number;
  reorderQuantity: number;
  targetQuantity?: number;
  leadTimeDays?: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const materialReorderRuleSchema = new Schema<IMaterialReorderRule>(
  {
    materialId: {
      type: Schema.Types.ObjectId,
      ref: 'Material',
      required: [true, 'Material reference is required'],
    },
    warehouseId: {
      type: Schema.Types.ObjectId,
      ref: 'Warehouse',
      default: null,
    },
    ownerType: {
      type: String,
      required: true,
      enum: ['FACTORY', 'CUSTOMER'],
      default: 'FACTORY',
    },
    minStockLevel: {
      type: Number,
      required: [true, 'Minimum stock level is required'],
      min: [0, 'Minimum stock level cannot be negative'],
    },
    maxStockLevel: {
      type: Number,
      min: [0, 'Maximum stock level cannot be negative'],
    },
    reorderPoint: {
      type: Number,
      required: [true, 'Reorder point is required'],
      min: [0, 'Reorder point cannot be negative'],
    },
    reorderQuantity: {
      type: Number,
      required: [true, 'Reorder quantity is required'],
      min: [0.000001, 'Reorder quantity must be positive'],
    },
    targetQuantity: {
      type: Number,
      min: [0, 'Target quantity cannot be negative'],
    },
    leadTimeDays: {
      type: Number,
      min: [0, 'Lead time cannot be negative'],
      default: 7,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  },
);

materialReorderRuleSchema.index({ materialId: 1, warehouseId: 1, ownerType: 1 }, { unique: true });

export const MaterialReorderRuleModel: Model<IMaterialReorderRule> =
  mongoose.models.MaterialReorderRule ||
  mongoose.model<IMaterialReorderRule>('MaterialReorderRule', materialReorderRuleSchema);

import mongoose, { Schema, Document, Model } from 'mongoose';

export type WarehouseType =
  | 'RAW_MATERIAL'
  | 'WORK_IN_PROGRESS'
  | 'FINISHED_GOODS'
  | 'SCRAP'
  | 'PACKING_MATERIAL'
  | 'CUSTOMER_SUPPLIED'
  | 'QUARANTINE';

export interface IWarehouse extends Document {
  code: string;
  name: string;
  type: WarehouseType;
  description?: string;
  location?: string;
  address?: string;
  managerId?: mongoose.Types.ObjectId;
  capacity?: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const warehouseSchema = new Schema<IWarehouse>(
  {
    code: {
      type: String,
      required: [true, 'Warehouse code is required'],
      unique: true,
      trim: true,
      uppercase: true,
    },
    name: {
      type: String,
      required: [true, 'Warehouse name is required'],
      trim: true,
    },
    type: {
      type: String,
      required: [true, 'Warehouse type is required'],
      enum: [
        'RAW_MATERIAL',
        'WORK_IN_PROGRESS',
        'FINISHED_GOODS',
        'SCRAP',
        'PACKING_MATERIAL',
        'CUSTOMER_SUPPLIED',
        'QUARANTINE',
      ],
      default: 'RAW_MATERIAL',
    },
    description: {
      type: String,
      trim: true,
    },
    location: {
      type: String,
      trim: true,
    },
    address: {
      type: String,
      trim: true,
    },
    managerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    capacity: {
      type: Number,
      min: [0, 'Capacity cannot be negative'],
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

warehouseSchema.index({ type: 1, isActive: 1 });

export const WarehouseModel: Model<IWarehouse> =
  mongoose.models.Warehouse || mongoose.model<IWarehouse>('Warehouse', warehouseSchema);

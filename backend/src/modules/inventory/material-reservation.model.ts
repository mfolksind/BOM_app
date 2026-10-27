import mongoose, { Schema, Document, Model } from 'mongoose';
import { StockOwnerType } from '../materials/material-lot.model';

export type ReservationStatus = 'ACTIVE' | 'FULFILLED' | 'RELEASED' | 'CANCELLED';

export interface IMaterialReservation extends Document {
  reservationNumber: string;
  workOrderId?: mongoose.Types.ObjectId;
  productionOrderId?: mongoose.Types.ObjectId;
  materialId: mongoose.Types.ObjectId;
  warehouseId: mongoose.Types.ObjectId;
  lotId?: mongoose.Types.ObjectId;
  ownerType: StockOwnerType;
  customerId?: mongoose.Types.ObjectId;
  reservedQuantity: number;
  unit: string;
  status: ReservationStatus;
  expiresAt?: Date;
  reservedBy?: mongoose.Types.ObjectId;
  releasedAt?: Date;
  releasedBy?: mongoose.Types.ObjectId;
  remarks?: string;
  createdAt: Date;
  updatedAt: Date;
}

const materialReservationSchema = new Schema<IMaterialReservation>(
  {
    reservationNumber: {
      type: String,
      required: [true, 'Reservation number is required'],
      unique: true,
      trim: true,
      uppercase: true,
    },
    workOrderId: {
      type: Schema.Types.ObjectId,
      ref: 'WorkOrder',
    },
    productionOrderId: {
      type: Schema.Types.ObjectId,
      ref: 'ProductionOrder',
    },
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
    lotId: {
      type: Schema.Types.ObjectId,
      ref: 'MaterialLot',
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
    },
    reservedQuantity: {
      type: Number,
      required: [true, 'Reserved quantity is required'],
      min: [0.000001, 'Reserved quantity must be positive'],
    },
    unit: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      required: true,
      enum: ['ACTIVE', 'FULFILLED', 'RELEASED', 'CANCELLED'],
      default: 'ACTIVE',
    },
    expiresAt: {
      type: Date,
    },
    reservedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    releasedAt: {
      type: Date,
    },
    releasedBy: {
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

materialReservationSchema.index({ materialId: 1, warehouseId: 1, status: 1 });
materialReservationSchema.index({ workOrderId: 1, productionOrderId: 1 });

export const MaterialReservationModel: Model<IMaterialReservation> =
  mongoose.models.MaterialReservation ||
  mongoose.model<IMaterialReservation>('MaterialReservation', materialReservationSchema);

import mongoose, { Schema, Document, Model } from 'mongoose';

export type ApprovalEntityType =
  | 'WORK_ORDER'
  | 'BOM_VERSION'
  | 'STOCK_RECONCILIATION'
  | 'DISPATCH'
  | 'PRODUCTION_ORDER'
  | 'SCRAP_RECORD';

export type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface IApproval extends Document {
  entityType: ApprovalEntityType;
  entityId: mongoose.Types.ObjectId;
  status: ApprovalStatus;
  approvedBy?: mongoose.Types.ObjectId;
  approvedAt?: Date;
  comments?: string;
  rejectionReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const approvalSchema = new Schema<IApproval>(
  {
    entityType: {
      type: String,
      required: [true, 'Entity type is required'],
      enum: [
        'WORK_ORDER',
        'BOM_VERSION',
        'STOCK_RECONCILIATION',
        'DISPATCH',
        'PRODUCTION_ORDER',
        'SCRAP_RECORD',
      ],
    },
    entityId: {
      type: Schema.Types.ObjectId,
      required: [true, 'Entity reference ID is required'],
      refPath: 'entityType',
    },
    status: {
      type: String,
      required: true,
      enum: ['PENDING', 'APPROVED', 'REJECTED'],
      default: 'PENDING',
    },
    approvedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    approvedAt: {
      type: Date,
    },
    comments: {
      type: String,
      trim: true,
    },
    rejectionReason: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  },
);

approvalSchema.index({ entityType: 1, entityId: 1 });
approvalSchema.index({ status: 1 });

export const ApprovalModel: Model<IApproval> =
  mongoose.models.Approval || mongoose.model<IApproval>('Approval', approvalSchema);

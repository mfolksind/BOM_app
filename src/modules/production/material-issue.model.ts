import mongoose, { Schema, Document, Model } from 'mongoose';

export type MaterialIssueStatus = 'DRAFT' | 'ISSUED' | 'CANCELLED';

export interface IMaterialIssue extends Document {
  issueNumber: string;
  productionOrderId: mongoose.Types.ObjectId;
  workOrderId?: mongoose.Types.ObjectId;
  processStageId?: mongoose.Types.ObjectId;
  sourceWarehouseId: mongoose.Types.ObjectId;
  destinationWarehouseId?: mongoose.Types.ObjectId;
  issuedBy?: mongoose.Types.ObjectId;
  receivedBy?: mongoose.Types.ObjectId;
  status: MaterialIssueStatus;
  issueDate: Date;
  postedBy?: mongoose.Types.ObjectId;
  postedAt?: Date;
  remarks?: string;
  createdAt: Date;
  updatedAt: Date;
}

const materialIssueSchema = new Schema<IMaterialIssue>(
  {
    issueNumber: {
      type: String,
      required: [true, 'Issue number is required'],
      unique: true,
      trim: true,
      uppercase: true,
    },
    productionOrderId: {
      type: Schema.Types.ObjectId,
      ref: 'ProductionOrder',
      required: [true, 'Production Order reference is required'],
    },
    workOrderId: {
      type: Schema.Types.ObjectId,
      ref: 'WorkOrder',
    },
    processStageId: {
      type: Schema.Types.ObjectId,
      ref: 'ProcessStage',
    },
    sourceWarehouseId: {
      type: Schema.Types.ObjectId,
      ref: 'Warehouse',
      required: [true, 'Source warehouse is required'],
    },
    destinationWarehouseId: {
      type: Schema.Types.ObjectId,
      ref: 'Warehouse',
    },
    issuedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    receivedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    postedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    postedAt: {
      type: Date,
    },
    status: {
      type: String,
      required: true,
      enum: ['DRAFT', 'ISSUED', 'CANCELLED'],
      default: 'DRAFT',
    },
    issueDate: {
      type: Date,
      required: true,
      default: Date.now,
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

materialIssueSchema.index({ productionOrderId: 1, status: 1 });

export const MaterialIssueModel: Model<IMaterialIssue> =
  mongoose.models.MaterialIssue ||
  mongoose.model<IMaterialIssue>('MaterialIssue', materialIssueSchema);

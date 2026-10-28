import mongoose, { Schema, Document, Model } from 'mongoose';

export type ProductionBatchStatus = 'PENDING' | 'IN_PROCESS' | 'COMPLETED' | 'HALTED' | 'REJECTED';

export type ProductionShift = 'SHIFT_A' | 'SHIFT_B' | 'SHIFT_C';

export type BatchTestStatus = 'NOT_TESTED' | 'TEST_PASSED' | 'TEST_FAILED';

export interface IBatchTestItem {
  testName: string;
  testType?: string;
  unit?: string;
  standardSpecification?: string;
  minValue?: number;
  maxValue?: number;
  expectedValue?: string;
  actualValue?: string;
  result: 'PASSED' | 'FAILED' | 'PENDING';
  remarks?: string;
}

export interface IBatchReworkEntry {
  reworkNumber: number;
  failedAt: Date;
  reason: string;
  tests?: IBatchTestItem[];
  resolvedAt?: Date;
  operatorNotes?: string;
}

export interface IProductionBatch extends Document {
  batchNumber: string;
  productionOrderId: mongoose.Types.ObjectId;
  workOrderId?: mongoose.Types.ObjectId;
  processStageId: mongoose.Types.ObjectId;
  machineId?: mongoose.Types.ObjectId;
  machineCode: string;
  operatorId?: mongoose.Types.ObjectId;
  plannedQuantity: number;
  completedQuantity: number;
  unit: string;
  status: ProductionBatchStatus;
  shift?: ProductionShift;
  testStatus?: BatchTestStatus;
  tests?: IBatchTestItem[];
  testReportNumber?: string;
  testedBy?: mongoose.Types.ObjectId;
  testedAt?: Date;
  reworkCount?: number;
  reworkHistory?: IBatchReworkEntry[];
  startedAt?: Date;
  completedAt?: Date;
  remarks?: string;
  createdAt: Date;
  updatedAt: Date;
}

const productionBatchSchema = new Schema<IProductionBatch>(
  {
    batchNumber: {
      type: String,
      required: [true, 'Batch number is required'],
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
      required: [true, 'Process Stage reference is required'],
    },
    machineId: {
      type: Schema.Types.ObjectId,
      ref: 'Machine',
    },
    machineCode: {
      type: String,
      required: [true, 'Machine code is required'],
      trim: true,
      uppercase: true,
    },
    operatorId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    plannedQuantity: {
      type: Number,
      default: 0,
      min: [0, 'Planned quantity cannot be negative'],
    },
    completedQuantity: {
      type: Number,
      default: 0,
      min: [0, 'Completed quantity cannot be negative'],
    },
    unit: {
      type: String,
      required: true,
      default: 'METER',
    },
    status: {
      type: String,
      required: true,
      enum: ['PENDING', 'IN_PROCESS', 'COMPLETED', 'HALTED', 'REJECTED'],
      default: 'PENDING',
    },
    shift: {
      type: String,
    },
    testStatus: {
      type: String,
      enum: ['NOT_TESTED', 'TEST_PASSED', 'TEST_FAILED'],
      default: 'NOT_TESTED',
    },
    tests: [
      {
        testName: { type: String, required: true, trim: true },
        testType: { type: String, trim: true },
        unit: { type: String, trim: true },
        standardSpecification: { type: String, trim: true },
        minValue: { type: Number },
        maxValue: { type: Number },
        expectedValue: { type: String, trim: true },
        actualValue: { type: String, trim: true },
        result: { type: String, enum: ['PASSED', 'FAILED', 'PENDING'], default: 'PENDING' },
        remarks: { type: String, trim: true },
      },
    ],
    testReportNumber: {
      type: String,
      trim: true,
    },
    testedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    testedAt: {
      type: Date,
    },
    reworkCount: {
      type: Number,
      default: 0,
    },
    reworkHistory: [
      {
        reworkNumber: { type: Number },
        failedAt: { type: Date, default: Date.now },
        reason: { type: String, trim: true },
        tests: { type: Array, default: [] },
        resolvedAt: { type: Date },
        operatorNotes: { type: String, trim: true },
      },
    ],
    startedAt: {
      type: Date,
    },
    completedAt: {
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

productionBatchSchema.index({ productionOrderId: 1, processStageId: 1 });
productionBatchSchema.index({ status: 1 });

export const ProductionBatchModel: Model<IProductionBatch> =
  mongoose.models.ProductionBatch ||
  mongoose.model<IProductionBatch>('ProductionBatch', productionBatchSchema);

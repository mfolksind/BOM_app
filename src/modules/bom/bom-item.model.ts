import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IBomItem extends Document {
  bomVersionId: mongoose.Types.ObjectId;
  materialId: mongoose.Types.ObjectId;
  processStageId?: mongoose.Types.ObjectId;
  quantityPerUnit: number; // e.g. kg of material per 1 unit of product
  scrapTolerancePercentage: number;
  isMandatory: boolean;
  stageSequence: number;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const bomItemSchema = new Schema<IBomItem>(
  {
    bomVersionId: {
      type: Schema.Types.ObjectId,
      ref: 'BomVersion',
      required: [true, 'BOM Version reference is required'],
    },
    materialId: {
      type: Schema.Types.ObjectId,
      ref: 'Material',
      required: [true, 'Material reference is required'],
    },
    processStageId: {
      type: Schema.Types.ObjectId,
      ref: 'ProcessStage',
    },
    quantityPerUnit: {
      type: Number,
      required: [true, 'Quantity per unit is required'],
      min: [0.000001, 'Quantity per unit must be greater than 0'],
    },
    scrapTolerancePercentage: {
      type: Number,
      default: 0,
      min: [0, 'Scrap tolerance cannot be negative'],
      max: [100, 'Scrap tolerance cannot exceed 100%'],
    },
    isMandatory: {
      type: Boolean,
      default: true,
    },
    stageSequence: {
      type: Number,
      default: 1,
      min: [1, 'Stage sequence must be at least 1'],
    },
    notes: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  },
);

bomItemSchema.index({ bomVersionId: 1, materialId: 1 });
bomItemSchema.index({ bomVersionId: 1, stageSequence: 1 });

export const BomItemModel: Model<IBomItem> =
  mongoose.models.BomItem || mongoose.model<IBomItem>('BomItem', bomItemSchema);

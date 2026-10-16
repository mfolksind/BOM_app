import mongoose, { Schema, Document, Model } from 'mongoose';

export type MaterialCategory =
  | 'COPPER'
  | 'ALUMINUM'
  | 'PVC_COMPOUND'
  | 'XLPE_COMPOUND'
  | 'MASTERBATCH'
  | 'GI_WIRE_STRIP'
  | 'TAPE_BINDING'
  | 'PACKING_MATERIAL'
  | 'CHEMICAL_SOLVENT'
  | 'OTHER';

export type MaterialBaseUnit = 'KG' | 'METER' | 'KM' | 'PCS' | 'PIECE' | 'ROLL' | 'DRUM' | 'LITER';

export interface IMaterial extends Document {
  code: string;
  name: string;
  description?: string;
  category: MaterialCategory;
  baseUnit: MaterialBaseUnit;
  sku?: string;
  altName?: string;
  specifications?: Record<string, unknown>;
  defaultReorderThreshold?: number;
  moduleTags: string[];
  hsnCode?: string;
  standardRate?: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const materialSchema = new Schema<IMaterial>(
  {
    code: {
      type: String,
      required: [true, 'Material code is required'],
      unique: true,
      trim: true,
      uppercase: true,
    },
    name: {
      type: String,
      required: [true, 'Material name is required'],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    category: {
      type: String,
      required: [true, 'Material category is required'],
      enum: [
        'COPPER',
        'ALUMINUM',
        'PVC_COMPOUND',
        'XLPE_COMPOUND',
        'MASTERBATCH',
        'GI_WIRE_STRIP',
        'TAPE_BINDING',
        'PACKING_MATERIAL',
        'CHEMICAL_SOLVENT',
        'OTHER',
      ],
    },
    baseUnit: {
      type: String,
      required: [true, 'Base unit of measurement is required'],
      enum: ['KG', 'METER', 'KM', 'PCS', 'PIECE', 'ROLL', 'DRUM', 'LITER'],
      default: 'KG',
    },
    sku: {
      type: String,
      trim: true,
      uppercase: true,
    },
    altName: {
      type: String,
      trim: true,
    },
    specifications: {
      type: Schema.Types.Mixed,
      default: {},
    },
    defaultReorderThreshold: {
      type: Number,
      min: [0, 'Default reorder threshold cannot be negative'],
    },
    moduleTags: {
      type: [String],
      default: [],
    },
    hsnCode: {
      type: String,
      trim: true,
    },
    standardRate: {
      type: Number,
      min: [0, 'Standard rate cannot be negative'],
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

materialSchema.index({ category: 1, isActive: 1 });
materialSchema.index({ name: 1 });
materialSchema.index({ sku: 1 });
materialSchema.index({ moduleTags: 1 });

export const MaterialModel: Model<IMaterial> =
  mongoose.models.Material || mongoose.model<IMaterial>('Material', materialSchema);

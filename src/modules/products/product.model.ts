import mongoose, { Schema, Document, Model } from 'mongoose';

export type CableCategory =
  'HT_POWER' | 'LT_POWER' | 'CONTROL' | 'INSTRUMENTATION' | 'SOLAR' | 'HOUSE_WIRE' | 'SUBMERSIBLE';

export type VoltageGrade = '1.1KV' | '3.3KV' | '6.6KV' | '11KV' | '22KV' | '33KV';
export type ConductorMaterial = 'COPPER' | 'ALUMINUM';
export type InsulationType = 'PVC' | 'XLPE';
export type ArmourType =
  'UNARMOURED' | 'ROUND_WIRE_ARMOURED' | 'STRIP_ARMOURED' | 'DOUBLE_STEEL_TAPE';
export type OuterSheathType = 'PVC_ST1' | 'PVC_ST2' | 'FRLS' | 'ZHFR';

export interface IProduct extends Document {
  code: string;
  name: string;
  description?: string;
  cableCategory: CableCategory;
  voltageGrade: VoltageGrade;
  coreCount: number;
  crossSectionSqMm: number;
  conductorMaterial: ConductorMaterial;
  insulationType: InsulationType;
  armourType: ArmourType;
  outerSheath: OuterSheathType;
  standardSpecification?: string;
  baseUnit: string;
  customerId?: mongoose.Types.ObjectId;
  defaultBomVersionId?: mongoose.Types.ObjectId;
  specifications?: Record<string, unknown>;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const productSchema = new Schema<IProduct>(
  {
    code: {
      type: String,
      required: [true, 'Product code is required'],
      unique: true,
      trim: true,
      uppercase: true,
    },
    name: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    cableCategory: {
      type: String,
      required: [true, 'Cable category is required'],
      enum: [
        'HT_POWER',
        'LT_POWER',
        'CONTROL',
        'INSTRUMENTATION',
        'SOLAR',
        'HOUSE_WIRE',
        'SUBMERSIBLE',
      ],
    },
    voltageGrade: {
      type: String,
      required: [true, 'Voltage grade is required'],
      enum: ['1.1KV', '3.3KV', '6.6KV', '11KV', '22KV', '33KV'],
      default: '1.1KV',
    },
    coreCount: {
      type: Number,
      required: [true, 'Core count is required'],
      min: [1, 'Core count must be at least 1'],
    },
    crossSectionSqMm: {
      type: Number,
      required: [true, 'Cross section in sq.mm is required'],
      min: [0.1, 'Cross section must be greater than 0'],
    },
    conductorMaterial: {
      type: String,
      required: [true, 'Conductor material is required'],
      enum: ['COPPER', 'ALUMINUM'],
    },
    insulationType: {
      type: String,
      required: [true, 'Insulation type is required'],
      enum: ['PVC', 'XLPE'],
    },
    armourType: {
      type: String,
      required: [true, 'Armour type is required'],
      enum: ['UNARMOURED', 'ROUND_WIRE_ARMOURED', 'STRIP_ARMOURED', 'DOUBLE_STEEL_TAPE'],
      default: 'UNARMOURED',
    },
    outerSheath: {
      type: String,
      required: [true, 'Outer sheath type is required'],
      enum: ['PVC_ST1', 'PVC_ST2', 'FRLS', 'ZHFR'],
      default: 'PVC_ST1',
    },
    standardSpecification: {
      type: String,
      trim: true,
    },
    baseUnit: {
      type: String,
      required: true,
      default: 'METER',
    },
    customerId: {
      type: Schema.Types.ObjectId,
      ref: 'Customer',
    },
    defaultBomVersionId: {
      type: Schema.Types.ObjectId,
      ref: 'BomVersion',
    },
    specifications: {
      type: Schema.Types.Mixed,
      default: {},
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

productSchema.index({ customerId: 1 });
productSchema.index({ cableCategory: 1, voltageGrade: 1 });
productSchema.index({ conductorMaterial: 1, crossSectionSqMm: 1, coreCount: 1 });

export const ProductModel: Model<IProduct> =
  mongoose.models.Product || mongoose.model<IProduct>('Product', productSchema);

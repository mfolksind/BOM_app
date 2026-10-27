import { z } from 'zod';
import mongoose from 'mongoose';

export const cableCategoryEnum = z.string().trim();
export const voltageGradeEnum = z.string().trim();
export const conductorMaterialEnum = z.string().trim();
export const insulationTypeEnum = z.string().trim();
export const armourTypeEnum = z.string().trim();
export const outerSheathTypeEnum = z.string().trim();

const objectIdValidator = z.string().refine((val) => mongoose.Types.ObjectId.isValid(val), {
  message: 'Invalid ObjectId format',
});

const normalizeProductInput = (raw: unknown) => {
  if (!raw || typeof raw !== 'object') return raw;
  const data = { ...(raw as Record<string, unknown>) };

  // Map aliases
  if (data.cores !== undefined && data.coreCount === undefined) {
    data.coreCount = data.cores;
  }
  if (data.crossSection !== undefined && data.crossSectionSqMm === undefined) {
    data.crossSectionSqMm = data.crossSection;
  }
  if (data.conductorType !== undefined && data.conductorMaterial === undefined) {
    data.conductorMaterial = String(data.conductorType).toUpperCase().trim();
  }
  if (data.sheathType !== undefined && data.outerSheath === undefined) {
    data.outerSheath = String(data.sheathType).toUpperCase().trim();
  }
  if (data.unitOfMeasurement !== undefined && data.baseUnit === undefined) {
    data.baseUnit = String(data.unitOfMeasurement).toUpperCase().trim();
  }

  // Normalize voltageGrade: e.g. "1100V", "1100 v", "1.1kv" -> "1.1KV"
  if (typeof data.voltageGrade === 'string') {
    const vg = data.voltageGrade.trim().toUpperCase().replace(/\s+/g, '');
    if (vg === '1100V' || vg === '1.1KV' || vg === '1100') {
      data.voltageGrade = '1.1KV';
    } else if (vg === '3300V' || vg === '3.3KV' || vg === '3300') {
      data.voltageGrade = '3.3KV';
    } else if (vg === '6600V' || vg === '6.6KV' || vg === '6600') {
      data.voltageGrade = '6.6KV';
    } else if (vg === '11000V' || vg === '11KV' || vg === '11000') {
      data.voltageGrade = '11KV';
    } else if (vg === '22000V' || vg === '22KV' || vg === '22000') {
      data.voltageGrade = '22KV';
    } else if (vg === '33000V' || vg === '33KV' || vg === '33000') {
      data.voltageGrade = '33KV';
    }
  }

  // Normalize armourType: e.g. "ROUND_WIRE" -> "ROUND_WIRE_ARMOURED"
  if (typeof data.armourType === 'string') {
    const at = data.armourType.trim().toUpperCase();
    if (at === 'ROUND_WIRE' || at === 'ROUND_WIRE_ARMOURED') {
      data.armourType = 'ROUND_WIRE_ARMOURED';
    } else if (at === 'STRIP' || at === 'STRIP_ARMOURED') {
      data.armourType = 'STRIP_ARMOURED';
    } else if (at === 'UNARMOURED') {
      data.armourType = 'UNARMOURED';
    } else if (at === 'DOUBLE_STEEL_TAPE' || at === 'STEEL_TAPE') {
      data.armourType = 'DOUBLE_STEEL_TAPE';
    }
  }

  // Default cableCategory if missing
  if (!data.cableCategory) {
    if (data.voltageGrade === '1.1KV') {
      data.cableCategory = 'LT_POWER';
    } else {
      data.cableCategory = 'HT_POWER';
    }
  } else if (typeof data.cableCategory === 'string') {
    data.cableCategory = data.cableCategory.trim().toUpperCase();
  }

  // Preserve standardLength in specifications if provided
  if (data.standardLength !== undefined) {
    const specs =
      data.specifications && typeof data.specifications === 'object'
        ? { ...(data.specifications as Record<string, unknown>) }
        : {};
    if (specs.standardLength === undefined) {
      specs.standardLength = data.standardLength;
    }
    data.specifications = specs;
  }

  return data;
};

const baseCreateProductSchema = z.object({
  code: z
    .string()
    .min(2, 'Product code must be at least 2 characters')
    .max(50, 'Product code cannot exceed 50 characters')
    .regex(/^[A-Z0-9_\-./]+$/i, 'Product code contains invalid characters')
    .trim()
    .transform((val) => val.toUpperCase()),
  name: z.string().min(2, 'Product name must be at least 2 characters').max(100).trim(),
  description: z.string().max(1000).trim().optional(),
  cableCategory: cableCategoryEnum.default('LT_POWER').optional(),
  voltageGrade: voltageGradeEnum.default('1.1KV').optional(),
  coreCount: z.coerce.number().int().min(1, 'Core count must be at least 1').default(1).optional(),
  crossSectionSqMm: z.coerce.number().positive('Cross section must be greater than 0').default(1.5).optional(),
  conductorMaterial: conductorMaterialEnum.default('COPPER').optional(),
  insulationType: insulationTypeEnum.default('PVC').optional(),
  armourType: armourTypeEnum.default('UNARMOURED').optional(),
  outerSheath: outerSheathTypeEnum.default('PVC_ST1').optional(),
  standardSpecification: z.string().max(200).trim().optional(),
  baseUnit: z.string().default('METER'),
  customerId: objectIdValidator.optional(),
  specifications: z.record(z.unknown()).optional().default({}),
  isActive: z.boolean().default(true),
});

export const createProductSchema = z.preprocess(
  normalizeProductInput,
  baseCreateProductSchema,
);

export const updateProductSchema = z.object({
  name: z.string().min(2).max(100).trim().optional(),
  description: z.string().max(1000).trim().optional(),
  cableCategory: cableCategoryEnum.optional(),
  voltageGrade: voltageGradeEnum.optional(),
  coreCount: z.coerce.number().int().min(1).optional(),
  crossSectionSqMm: z.coerce.number().positive().optional(),
  conductorMaterial: conductorMaterialEnum.optional(),
  insulationType: insulationTypeEnum.optional(),
  armourType: armourTypeEnum.optional(),
  outerSheath: outerSheathTypeEnum.optional(),
  standardSpecification: z.string().max(200).trim().optional(),
  baseUnit: z.string().optional(),
  customerId: objectIdValidator.nullable().optional(),
  specifications: z.record(z.unknown()).optional(),
});

export const updateProductStatusSchema = z.object({
  isActive: z.boolean(),
  reason: z.string().max(500).trim().optional(),
});

export const productQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().trim().optional(),
  cableCategory: cableCategoryEnum.optional(),
  voltageGrade: voltageGradeEnum.optional(),
  conductorMaterial: conductorMaterialEnum.optional(),
  customerId: objectIdValidator.optional(),
  isActive: z
    .enum(['true', 'false'])
    .transform((val) => val === 'true')
    .optional(),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type UpdateProductStatusInput = z.infer<typeof updateProductStatusSchema>;
export type ProductQueryParams = z.infer<typeof productQuerySchema>;

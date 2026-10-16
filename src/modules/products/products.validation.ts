import { z } from 'zod';
import mongoose from 'mongoose';

export const cableCategoryEnum = z.enum([
  'HT_POWER',
  'LT_POWER',
  'CONTROL',
  'INSTRUMENTATION',
  'SOLAR',
  'HOUSE_WIRE',
  'SUBMERSIBLE',
]);

export const voltageGradeEnum = z.enum(['1.1KV', '3.3KV', '6.6KV', '11KV', '22KV', '33KV']);
export const conductorMaterialEnum = z.enum(['COPPER', 'ALUMINUM']);
export const insulationTypeEnum = z.enum(['PVC', 'XLPE']);
export const armourTypeEnum = z.enum([
  'UNARMOURED',
  'ROUND_WIRE_ARMOURED',
  'STRIP_ARMOURED',
  'DOUBLE_STEEL_TAPE',
]);
export const outerSheathTypeEnum = z.enum(['PVC_ST1', 'PVC_ST2', 'FRLS', 'ZHFR']);

const objectIdValidator = z.string().refine((val) => mongoose.Types.ObjectId.isValid(val), {
  message: 'Invalid ObjectId format',
});

export const createProductSchema = z.object({
  code: z
    .string()
    .min(2, 'Product code must be at least 2 characters')
    .max(50, 'Product code cannot exceed 50 characters')
    .regex(/^[A-Z0-9_\-./]+$/i, 'Product code contains invalid characters')
    .trim()
    .transform((val) => val.toUpperCase()),
  name: z.string().min(2, 'Product name must be at least 2 characters').max(100).trim(),
  description: z.string().max(1000).trim().optional(),
  cableCategory: cableCategoryEnum,
  voltageGrade: voltageGradeEnum.default('1.1KV'),
  coreCount: z.coerce.number().int().min(1, 'Core count must be at least 1'),
  crossSectionSqMm: z.coerce.number().positive('Cross section must be greater than 0'),
  conductorMaterial: conductorMaterialEnum,
  insulationType: insulationTypeEnum,
  armourType: armourTypeEnum.default('UNARMOURED'),
  outerSheath: outerSheathTypeEnum.default('PVC_ST1'),
  standardSpecification: z.string().max(200).trim().optional(),
  baseUnit: z.string().default('METER'),
  customerId: objectIdValidator.optional(),
  specifications: z.record(z.unknown()).optional().default({}),
  isActive: z.boolean().default(true),
});

export const updateProductSchema = z
  .object({
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
  })
  .strict();

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

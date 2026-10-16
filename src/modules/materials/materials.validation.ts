import { z } from 'zod';

export const materialCategoryEnum = z.enum([
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
]);

export const materialBaseUnitEnum = z.enum([
  'KG',
  'METER',
  'KM',
  'PCS',
  'PIECE',
  'ROLL',
  'DRUM',
  'LITER',
]);

export const createMaterialSchema = z.object({
  code: z
    .string()
    .min(2, 'Material code must be at least 2 characters')
    .max(30, 'Material code cannot exceed 30 characters')
    .regex(
      /^[A-Z0-9_-]+$/i,
      'Material code must only contain letters, numbers, hyphens, and underscores',
    )
    .trim()
    .transform((val) => val.toUpperCase()),
  name: z.string().min(2, 'Material name must be at least 2 characters').max(100).trim(),
  description: z.string().max(1000).trim().optional(),
  category: materialCategoryEnum,
  baseUnit: materialBaseUnitEnum.default('KG'),
  sku: z
    .string()
    .max(50)
    .trim()
    .transform((val) => val.toUpperCase())
    .optional(),
  altName: z.string().max(100).trim().optional(),
  specifications: z.record(z.unknown()).optional().default({}),
  defaultReorderThreshold: z.coerce
    .number()
    .min(0, 'Default reorder threshold cannot be negative')
    .optional(),
  moduleTags: z.array(z.string().trim()).optional().default([]),
  hsnCode: z.string().max(20).trim().optional(),
  standardRate: z.coerce.number().min(0, 'Standard rate cannot be negative').optional(),
  isActive: z.boolean().default(true),
});

export const updateMaterialSchema = z
  .object({
    name: z.string().min(2).max(100).trim().optional(),
    description: z.string().max(1000).trim().optional(),
    category: materialCategoryEnum.optional(),
    baseUnit: materialBaseUnitEnum.optional(),
    sku: z
      .string()
      .max(50)
      .trim()
      .transform((val) => val.toUpperCase())
      .optional(),
    altName: z.string().max(100).trim().optional(),
    specifications: z.record(z.unknown()).optional(),
    defaultReorderThreshold: z.coerce
      .number()
      .min(0, 'Default reorder threshold cannot be negative')
      .optional(),
    moduleTags: z.array(z.string().trim()).optional(),
    hsnCode: z.string().max(20).trim().optional(),
    standardRate: z.coerce.number().min(0, 'Standard rate cannot be negative').optional(),
  })
  .strict();

export const updateMaterialStatusSchema = z.object({
  isActive: z.boolean(),
  reason: z.string().max(500).trim().optional(),
});

export const materialQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().trim().optional(),
  category: materialCategoryEnum.optional(),
  isActive: z
    .enum(['true', 'false'])
    .transform((val) => val === 'true')
    .optional(),
});

export type CreateMaterialInput = z.infer<typeof createMaterialSchema>;
export type UpdateMaterialInput = z.infer<typeof updateMaterialSchema>;
export type UpdateMaterialStatusInput = z.infer<typeof updateMaterialStatusSchema>;
export type MaterialQueryParams = z.infer<typeof materialQuerySchema>;

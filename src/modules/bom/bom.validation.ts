import { z } from 'zod';
import mongoose from 'mongoose';

const objectIdValidator = z.string().refine((val) => mongoose.Types.ObjectId.isValid(val), {
  message: 'Invalid ObjectId format',
});

export const bomItemInputSchema = z.object({
  materialId: objectIdValidator,
  processStageId: objectIdValidator.optional(),
  quantityPerUnit: z.coerce.number().positive('Quantity per unit must be greater than 0'),
  scrapTolerancePercentage: z.coerce
    .number()
    .min(0, 'Scrap tolerance cannot be negative')
    .max(100, 'Scrap tolerance cannot exceed 100%')
    .default(0),
  isMandatory: z.boolean().default(true),
  stageSequence: z.coerce.number().int().min(1, 'Stage sequence must be at least 1').default(1),
  notes: z.string().max(500).trim().optional(),
});

export const createBomSchema = z.object({
  productId: objectIdValidator,
  versionNumber: z.coerce.number().int().min(1, 'Version number must be at least 1').optional(),
  bomNumber: z
    .string()
    .min(2)
    .max(50)
    .trim()
    .transform((val) => val.toUpperCase())
    .optional(),
  effectiveFrom: z.coerce.date().optional(),
  batchSize: z.coerce.number().positive('Batch size must be greater than 0').default(1000),
  outputUnit: z.string().default('METER'),
  notes: z.string().max(1000).trim().optional(),
  items: z.array(bomItemInputSchema).min(1, 'At least one material item is required in a BOM'),
});

export const updateBomSchema = z
  .object({
    batchSize: z.coerce.number().positive('Batch size must be greater than 0').optional(),
    outputUnit: z.string().optional(),
    notes: z.string().max(1000).trim().optional(),
    items: z.array(bomItemInputSchema).min(1, 'At least one material item is required').optional(),
  })
  .strict();

export const bomQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  productId: objectIdValidator.optional(),
  status: z.enum(['DRAFT', 'ACTIVE', 'ARCHIVED', 'SUPERSEDED']).optional(),
});

export type BomItemInput = z.infer<typeof bomItemInputSchema>;
export type CreateBomInput = z.infer<typeof createBomSchema>;
export type UpdateBomInput = z.infer<typeof updateBomSchema>;
export type BomQueryParams = z.infer<typeof bomQuerySchema>;

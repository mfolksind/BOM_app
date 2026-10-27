import { z } from 'zod';
import mongoose from 'mongoose';

const objectIdSchema = z
  .string()
  .trim()
  .refine((val) => mongoose.Types.ObjectId.isValid(val), {
    message: 'Invalid ObjectId format',
  });

export const createMaterialReorderRuleSchema = z.object({
  materialId: objectIdSchema,
  warehouseId: objectIdSchema.optional(),
  ownerType: z
    .enum(['FACTORY', 'CUSTOMER', 'FACTORY_OWNED', 'CUSTOMER_OWNED'])
    .default('FACTORY')
    .transform((val) => {
      if (val === 'FACTORY_OWNED') return 'FACTORY';
      if (val === 'CUSTOMER_OWNED') return 'CUSTOMER';
      return val as 'FACTORY' | 'CUSTOMER';
    }),
  minStockLevel: z.number().nonnegative('Minimum stock level cannot be negative'),
  maxStockLevel: z.number().nonnegative('Maximum stock level cannot be negative').optional(),
  reorderPoint: z.number().nonnegative('Reorder point cannot be negative'),
  reorderQuantity: z.number().positive('Reorder quantity must be greater than 0'),
  targetQuantity: z.number().nonnegative('Target quantity cannot be negative').optional(),
  leadTimeDays: z.number().nonnegative().optional(),
  isActive: z.boolean().default(true),
});

export const updateMaterialReorderRuleSchema = z.object({
  minStockLevel: z.number().nonnegative().optional(),
  maxStockLevel: z.number().nonnegative().optional(),
  reorderPoint: z.number().nonnegative().optional(),
  reorderQuantity: z.number().positive().optional(),
  targetQuantity: z.number().nonnegative().optional(),
  leadTimeDays: z.number().nonnegative().optional(),
  isActive: z.boolean().optional(),
});

export const materialReorderRuleQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  materialId: objectIdSchema.optional(),
  warehouseId: objectIdSchema.optional(),
  isActive: z
    .string()
    .optional()
    .transform((val) => (val === undefined ? undefined : val === 'true')),
});

export type CreateMaterialReorderRuleInput = z.infer<typeof createMaterialReorderRuleSchema>;
export type UpdateMaterialReorderRuleInput = z.infer<typeof updateMaterialReorderRuleSchema>;
export type MaterialReorderRuleQueryParams = z.infer<typeof materialReorderRuleQuerySchema>;

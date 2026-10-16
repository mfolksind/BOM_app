import { z } from 'zod';
import mongoose from 'mongoose';

const objectIdSchema = z
  .string()
  .trim()
  .refine((val) => mongoose.Types.ObjectId.isValid(val), {
    message: 'Invalid ObjectId format',
  });

export const createStockReconciliationSchema = z
  .object({
    warehouseId: objectIdSchema,
    materialId: objectIdSchema,
    lotId: objectIdSchema.optional(),
    ownerType: z
      .enum(['FACTORY', 'CUSTOMER', 'FACTORY_OWNED', 'CUSTOMER_OWNED'])
      .default('FACTORY')
      .transform((val) => {
        if (val === 'FACTORY_OWNED') return 'FACTORY';
        if (val === 'CUSTOMER_OWNED') return 'CUSTOMER';
        return val as 'FACTORY' | 'CUSTOMER';
      }),
    customerId: objectIdSchema.optional(),
    physicalQuantity: z.number().nonnegative('Physical quantity cannot be negative'),
    unit: z.string().trim().min(1, 'Unit is required'),
    reason: z.string().trim().min(1, 'Reason for reconciliation is required'),
  })
  .superRefine((data, ctx) => {
    if (data.ownerType === 'CUSTOMER' && !data.customerId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['customerId'],
        message: 'Customer ID is required for customer-owned stock reconciliation',
      });
    }
  });

export const approveStockReconciliationSchema = z.object({
  comments: z.string().trim().optional(),
});

export const postStockReconciliationSchema = z.object({
  idempotencyKey: z.string().trim().optional(),
  remarks: z.string().trim().optional(),
});

export const stockReconciliationQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  materialId: objectIdSchema.optional(),
  warehouseId: objectIdSchema.optional(),
  status: z.enum(['DRAFT', 'APPROVED', 'REJECTED', 'APPLIED', 'POSTED']).optional(),
  ownerType: z.enum(['FACTORY', 'CUSTOMER', 'FACTORY_OWNED', 'CUSTOMER_OWNED']).optional(),
});

export type CreateStockReconciliationInput = z.infer<typeof createStockReconciliationSchema>;
export type ApproveStockReconciliationInput = z.infer<typeof approveStockReconciliationSchema>;
export type PostStockReconciliationInput = z.infer<typeof postStockReconciliationSchema>;
export type StockReconciliationQueryParams = z.infer<typeof stockReconciliationQuerySchema>;

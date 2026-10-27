import { z } from 'zod';
import mongoose from 'mongoose';

const objectIdSchema = z
  .string()
  .trim()
  .refine((val) => mongoose.Types.ObjectId.isValid(val), {
    message: 'Invalid ObjectId format',
  });

export const createStockTransferSchema = z
  .object({
    sourceWarehouseId: objectIdSchema,
    destinationWarehouseId: objectIdSchema,
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
    quantity: z.number().positive('Transfer quantity must be greater than 0'),
    unit: z.string().trim().min(1, 'Unit is required'),
    remarks: z.string().trim().optional(),
    autoPost: z.boolean().default(false),
  })
  .superRefine((data, ctx) => {
    if (data.sourceWarehouseId === data.destinationWarehouseId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['destinationWarehouseId'],
        message: 'Destination warehouse must be different from source warehouse',
      });
    }
    if (data.ownerType === 'CUSTOMER' && !data.customerId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['customerId'],
        message: 'Customer ID is required for customer-owned stock transfer',
      });
    }
  });

export const postStockTransferSchema = z.object({
  idempotencyKey: z.string().trim().optional(),
  remarks: z.string().trim().optional(),
});

export const stockTransferQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  materialId: objectIdSchema.optional(),
  sourceWarehouseId: objectIdSchema.optional(),
  destinationWarehouseId: objectIdSchema.optional(),
  status: z.enum(['DRAFT', 'POSTED', 'CANCELLED']).optional(),
  ownerType: z.enum(['FACTORY', 'CUSTOMER', 'FACTORY_OWNED', 'CUSTOMER_OWNED']).optional(),
});

export type CreateStockTransferInput = z.infer<typeof createStockTransferSchema>;
export type PostStockTransferInput = z.infer<typeof postStockTransferSchema>;
export type StockTransferQueryParams = z.infer<typeof stockTransferQuerySchema>;

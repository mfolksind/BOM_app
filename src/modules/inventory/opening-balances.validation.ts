import { z } from 'zod';
import mongoose from 'mongoose';

const objectIdSchema = z
  .string()
  .trim()
  .refine((val) => mongoose.Types.ObjectId.isValid(val), {
    message: 'Invalid ObjectId format',
  });

export const createOpeningBalanceSchema = z
  .object({
    materialId: objectIdSchema,
    warehouseId: objectIdSchema,
    ownerType: z
      .enum(['FACTORY', 'CUSTOMER', 'FACTORY_OWNED', 'CUSTOMER_OWNED'])
      .default('FACTORY')
      .transform((val) => {
        if (val === 'FACTORY_OWNED') return 'FACTORY';
        if (val === 'CUSTOMER_OWNED') return 'CUSTOMER';
        return val as 'FACTORY' | 'CUSTOMER';
      }),
    customerId: objectIdSchema.optional(),
    quantity: z.number().positive('Quantity must be greater than 0'),
    unit: z.string().trim().min(1, 'Unit is required'),
    valuationRate: z.number().nonnegative().optional(),
    effectiveDate: z.coerce.date().optional(),
    lotNumber: z.string().trim().optional(),
    supplierLotNumber: z.string().trim().optional(),
    remarks: z.string().trim().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.ownerType === 'CUSTOMER' && !data.customerId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['customerId'],
        message: 'Customer ID is required for customer-owned opening balances',
      });
    }
  });

export const updateOpeningBalanceSchema = z.object({
  quantity: z.number().positive().optional(),
  unit: z.string().trim().min(1).optional(),
  valuationRate: z.number().nonnegative().optional(),
  effectiveDate: z.coerce.date().optional(),
  remarks: z.string().trim().optional(),
});

export const postOpeningBalanceSchema = z.object({
  idempotencyKey: z.string().trim().optional(),
  remarks: z.string().trim().optional(),
});

export const openingBalanceQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  materialId: objectIdSchema.optional(),
  warehouseId: objectIdSchema.optional(),
  status: z.enum(['DRAFT', 'POSTED']).optional(),
  ownerType: z.enum(['FACTORY', 'CUSTOMER', 'FACTORY_OWNED', 'CUSTOMER_OWNED']).optional(),
});

export type CreateOpeningBalanceInput = z.infer<typeof createOpeningBalanceSchema>;
export type UpdateOpeningBalanceInput = z.infer<typeof updateOpeningBalanceSchema>;
export type PostOpeningBalanceInput = z.infer<typeof postOpeningBalanceSchema>;
export type OpeningBalanceQueryParams = z.infer<typeof openingBalanceQuerySchema>;

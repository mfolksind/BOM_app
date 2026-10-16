import { z } from 'zod';
import mongoose from 'mongoose';

const objectIdSchema = z
  .string()
  .trim()
  .refine((val) => mongoose.Types.ObjectId.isValid(val), {
    message: 'Invalid ObjectId format',
  });

export const createMaterialReservationSchema = z
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
    lotId: objectIdSchema.optional(),
    reservedQuantity: z.number().positive('Reserved quantity must be greater than 0'),
    unit: z.string().trim().min(1, 'Unit is required'),
    workOrderId: objectIdSchema.optional(),
    productionOrderId: objectIdSchema.optional(),
    expiresAt: z.coerce.date().optional(),
    remarks: z.string().trim().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.ownerType === 'CUSTOMER' && !data.customerId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['customerId'],
        message: 'Customer ID is required for customer-owned material reservation',
      });
    }
  });

export const releaseMaterialReservationSchema = z.object({
  remarks: z.string().trim().optional(),
});

export const materialReservationQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  materialId: objectIdSchema.optional(),
  warehouseId: objectIdSchema.optional(),
  status: z.enum(['ACTIVE', 'FULFILLED', 'RELEASED', 'CANCELLED']).optional(),
  ownerType: z.enum(['FACTORY', 'CUSTOMER', 'FACTORY_OWNED', 'CUSTOMER_OWNED']).optional(),
  workOrderId: objectIdSchema.optional(),
});

export type CreateMaterialReservationInput = z.infer<typeof createMaterialReservationSchema>;
export type ReleaseMaterialReservationInput = z.infer<typeof releaseMaterialReservationSchema>;
export type MaterialReservationQueryParams = z.infer<typeof materialReservationQuerySchema>;

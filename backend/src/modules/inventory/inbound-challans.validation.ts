import { z } from 'zod';
import mongoose from 'mongoose';

const objectIdSchema = z
  .string()
  .trim()
  .refine((val) => mongoose.Types.ObjectId.isValid(val), {
    message: 'Invalid ObjectId format',
  });

export const inboundChallanLineInputSchema = z.object({
  materialId: objectIdSchema,
  declaredQuantity: z.number().positive('Declared quantity must be greater than 0'),
  receivedQuantity: z.number().positive('Received quantity must be greater than 0'),
  unit: z.string().trim().min(1, 'Unit is required'),
  supplierLotNumber: z.string().trim().optional(),
  remarks: z.string().trim().optional(),
});

export const createInboundChallanSchema = z
  .object({
    customerChallanNumber: z.string().trim().min(1, 'Customer challan number is required'),
    customerChallanDate: z.coerce.date(),
    ownerType: z
      .enum(['FACTORY', 'CUSTOMER', 'FACTORY_OWNED', 'CUSTOMER_OWNED'])
      .default('CUSTOMER')
      .transform((val) => {
        if (val === 'FACTORY_OWNED') return 'FACTORY';
        if (val === 'CUSTOMER_OWNED') return 'CUSTOMER';
        return val as 'FACTORY' | 'CUSTOMER';
      }),
    customerId: objectIdSchema.optional(),
    warehouseId: objectIdSchema,
    vehicleNumber: z.string().trim().optional(),
    transporterName: z.string().trim().optional(),
    lrNumber: z.string().trim().optional(),
    remarks: z.string().trim().optional(),
    lines: z.array(inboundChallanLineInputSchema).min(1, 'At least one material line is required'),
  })
  .superRefine((data, ctx) => {
    if (data.ownerType === 'CUSTOMER' && !data.customerId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['customerId'],
        message: 'Customer ID is required for customer-owned inbound receipts',
      });
    }
  });

export const updateInboundChallanSchema = z.object({
  customerChallanNumber: z.string().trim().min(1).optional(),
  customerChallanDate: z.coerce.date().optional(),
  vehicleNumber: z.string().trim().optional(),
  transporterName: z.string().trim().optional(),
  lrNumber: z.string().trim().optional(),
  remarks: z.string().trim().optional(),
  lines: z.array(inboundChallanLineInputSchema).min(1).optional(),
});

export const postInboundChallanSchema = z.object({
  idempotencyKey: z.string().trim().optional(),
  remarks: z.string().trim().optional(),
});

export const inboundChallanQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  status: z.enum(['DRAFT', 'RECEIVED', 'VERIFIED', 'POSTED', 'CANCELLED']).optional(),
  customerId: objectIdSchema.optional(),
  warehouseId: objectIdSchema.optional(),
  ownerType: z.enum(['FACTORY', 'CUSTOMER', 'FACTORY_OWNED', 'CUSTOMER_OWNED']).optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  search: z.string().trim().optional(),
});

export type CreateInboundChallanInput = z.infer<typeof createInboundChallanSchema>;
export type UpdateInboundChallanInput = z.infer<typeof updateInboundChallanSchema>;
export type PostInboundChallanInput = z.infer<typeof postInboundChallanSchema>;
export type InboundChallanQueryParams = z.infer<typeof inboundChallanQuerySchema>;

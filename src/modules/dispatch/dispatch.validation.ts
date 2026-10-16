import { z } from 'zod';

const objectIdRegex = /^[0-9a-fA-F]{24}$/;
const objectIdSchema = z.string().regex(objectIdRegex, 'Invalid ObjectId');

export const createDispatchSchema = {
  body: z.object({
    workOrderId: objectIdSchema,
    customerId: objectIdSchema,
    packingListId: objectIdSchema.optional(),
    packingListIds: z.array(objectIdSchema).optional(),
    sourceWarehouseId: objectIdSchema.optional(),
    destinationAddress: z.string().trim().optional(),
    vehicleNumber: z.string().trim().optional(),
    transporter: z.string().trim().optional(),
    driverName: z.string().trim().optional(),
    driverPhone: z.string().trim().optional(),
    lrNumber: z.string().trim().optional(),
    eWayBillNumber: z.string().trim().optional(),
    eWayBillDate: z.string().datetime({ offset: true }).or(z.string().date()).optional(),
    remarks: z.string().trim().optional(),
    lines: z
      .array(
        z.object({
          drumId: objectIdSchema,
          packingListLineId: objectIdSchema.optional(),
          productId: objectIdSchema.optional(),
          lengthMeters: z.number().positive().optional(),
          grossWeightKg: z.number().positive().optional(),
          tareWeightKg: z.number().min(0).optional(),
          netWeightKg: z.number().min(0).optional(),
          remarks: z.string().trim().optional(),
        }),
      )
      .optional(),
  }),
};

export const updateDispatchSchema = {
  params: z.object({
    id: objectIdSchema,
  }),
  body: z
    .object({
      sourceWarehouseId: objectIdSchema.optional(),
      destinationAddress: z.string().trim().optional(),
      vehicleNumber: z.string().trim().optional(),
      transporter: z.string().trim().optional(),
      driverName: z.string().trim().optional(),
      driverPhone: z.string().trim().optional(),
      lrNumber: z.string().trim().optional(),
      eWayBillNumber: z.string().trim().optional(),
      eWayBillDate: z.string().datetime({ offset: true }).or(z.string().date()).optional(),
      remarks: z.string().trim().optional(),
      lines: z
        .array(
          z.object({
            drumId: objectIdSchema,
            packingListLineId: objectIdSchema.optional(),
            productId: objectIdSchema.optional(),
            lengthMeters: z.number().positive().optional(),
            grossWeightKg: z.number().positive().optional(),
            tareWeightKg: z.number().min(0).optional(),
            netWeightKg: z.number().min(0).optional(),
            remarks: z.string().trim().optional(),
          }),
        )
        .optional(),
    })
    .strict(),
};

export const listDispatchesQuerySchema = {
  query: z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
    workOrderId: objectIdSchema.optional(),
    customerId: objectIdSchema.optional(),
    status: z
      .enum(['DRAFT', 'READY_FOR_DISPATCH', 'DISPATCHED', 'DELIVERED', 'CANCELLED'])
      .optional(),
    search: z.string().trim().optional(),
  }),
};

export const dispatchIdParamSchema = {
  params: z.object({
    id: objectIdSchema,
  }),
};

export const cancelDispatchSchema = {
  params: z.object({
    id: objectIdSchema,
  }),
  body: z.object({
    reason: z.string().trim().min(3, 'Cancellation reason is required'),
  }),
};

export const createOutboundChallanSchema = {
  body: z.object({
    dispatchId: objectIdSchema,
    deliveryTerms: z.string().trim().optional(),
    eWayBillNumber: z.string().trim().optional(),
    eWayBillDate: z.string().datetime({ offset: true }).or(z.string().date()).optional(),
    remarks: z.string().trim().optional(),
  }),
};

export const listOutboundChallansQuerySchema = {
  query: z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
    customerId: objectIdSchema.optional(),
    workOrderId: objectIdSchema.optional(),
    dispatchId: objectIdSchema.optional(),
    status: z.enum(['DRAFT', 'ISSUED', 'ACKNOWLEDGED', 'CANCELLED']).optional(),
    search: z.string().trim().optional(),
  }),
};

export const outboundChallanIdParamSchema = {
  params: z.object({
    id: objectIdSchema,
  }),
};

export const generateOutboundChallanSchema = {
  params: z.object({
    id: objectIdSchema,
  }),
  body: z
    .object({
      deliveryTerms: z.string().trim().optional(),
      eWayBillNumber: z.string().trim().optional(),
      eWayBillDate: z.string().datetime({ offset: true }).or(z.string().date()).optional(),
      remarks: z.string().trim().optional(),
    })
    .optional(),
};

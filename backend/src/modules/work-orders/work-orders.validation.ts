import { z } from 'zod';

const objectIdRegex = /^[0-9a-fA-F]{24}$/;
const objectIdSchema = z.string().regex(objectIdRegex, 'Invalid ObjectId');

export const createWorkOrderSchema = {
  body: z.object({
    customerId: objectIdSchema,
    productId: objectIdSchema,
    bomVersionId: objectIdSchema,
    orderedLengthMeters: z.number().positive('Ordered length must be greater than 0'),
    customerPoNumber: z.string().trim().optional(),
    customerPoDate: z.string().datetime({ offset: true }).or(z.string().date()).optional(),
    jobWorkRatePerMeter: z.number().min(0).optional(),
    targetDeliveryDate: z.string().datetime({ offset: true }).or(z.string().date()),
    plannedStartDate: z.string().datetime({ offset: true }).or(z.string().date()).optional(),
    plannedCompletionDate: z.string().datetime({ offset: true }).or(z.string().date()).optional(),
    priority: z.string().trim().default('NORMAL'),
    notes: z.string().trim().optional(),
    remarks: z.string().trim().optional(),
    customerSpecifications: z.string().trim().optional(),
  }),
};

export const updateWorkOrderSchema = {
  params: z.object({
    id: objectIdSchema,
  }),
  body: z.object({
    orderedLengthMeters: z.number().positive().optional(),
    customerPoNumber: z.string().trim().optional(),
    customerPoDate: z.string().datetime({ offset: true }).or(z.string().date()).optional(),
    jobWorkRatePerMeter: z.number().min(0).optional(),
    targetDeliveryDate: z.string().datetime({ offset: true }).or(z.string().date()).optional(),
    plannedStartDate: z.string().datetime({ offset: true }).or(z.string().date()).optional(),
    plannedCompletionDate: z.string().datetime({ offset: true }).or(z.string().date()).optional(),
    priority: z.string().trim().optional(),
    notes: z.string().trim().optional(),
    remarks: z.string().trim().optional(),
    customerSpecifications: z.string().trim().optional(),
  }),
};

export const listWorkOrdersQuerySchema = {
  query: z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
    customerId: objectIdSchema.optional(),
    productId: objectIdSchema.optional(),
    status: z.string().trim().optional(),
    priority: z.string().trim().optional(),
    search: z.string().trim().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
  }),
};

export const workOrderIdParamSchema = {
  params: z.object({
    id: objectIdSchema,
  }),
};

export const cancelWorkOrderSchema = {
  params: z.object({
    id: objectIdSchema,
  }),
  body: z.object({
    reason: z.string().trim().min(3, 'Cancellation reason is required'),
  }),
};

export const holdWorkOrderSchema = {
  params: z.object({
    id: objectIdSchema,
  }),
  body: z.object({
    reason: z.string().trim().min(3, 'Hold reason is required'),
  }),
};

export const completeWorkOrderSchema = {
  params: z.object({
    id: objectIdSchema,
  }),
  body: z.object({
    remarks: z.string().trim().optional(),
    force: z.boolean().default(false),
  }),
};

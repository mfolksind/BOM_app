import { z } from 'zod';

const objectIdRegex = /^[0-9a-fA-F]{24}$/;
const objectIdSchema = z.string().regex(objectIdRegex, 'Invalid ObjectId');

const dateRangeRefine = (data: { startDate?: Date; endDate?: Date }) => {
  if (data.startDate && data.endDate && data.startDate.getTime() > data.endDate.getTime()) {
    return false;
  }
  return true;
};

// 1. Dashboard Query Validation
export const dashboardReportQuerySchema = {
  query: z
    .object({
      startDate: z.coerce.date().optional(),
      endDate: z.coerce.date().optional(),
      warehouseId: objectIdSchema.optional(),
      materialId: objectIdSchema.optional(),
      ownerType: z.enum(['FACTORY', 'CUSTOMER', 'FACTORY_OWNED', 'CUSTOMER_OWNED']).optional(),
      customerId: objectIdSchema.optional(),
    })
    .refine(dateRangeRefine, {
      message: 'startDate cannot be after endDate',
      path: ['startDate'],
    }),
};

// 2. Inventory Summary Query Validation
export const inventorySummaryReportQuerySchema = {
  query: z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(200).default(50),
    warehouseId: objectIdSchema.optional(),
    materialId: objectIdSchema.optional(),
    ownerType: z.enum(['FACTORY', 'CUSTOMER', 'FACTORY_OWNED', 'CUSTOMER_OWNED']).optional(),
    customerId: objectIdSchema.optional(),
    search: z.string().trim().optional(),
    belowReorderOnly: z.coerce.boolean().optional(),
  }),
};

// 3. Daily Stock Movement Query Validation
export const dailyStockMovementReportQuerySchema = {
  query: z
    .object({
      startDate: z.coerce.date().optional(),
      endDate: z.coerce.date().optional(),
      date: z.coerce.date().optional(),
      materialId: objectIdSchema.optional(),
      warehouseId: objectIdSchema.optional(),
      ownerType: z.enum(['FACTORY', 'CUSTOMER', 'FACTORY_OWNED', 'CUSTOMER_OWNED']).optional(),
      customerId: objectIdSchema.optional(),
      lotId: objectIdSchema.optional(),
      page: z.coerce.number().int().positive().default(1),
      limit: z.coerce.number().int().positive().max(200).default(50),
    })
    .refine(dateRangeRefine, {
      message: 'startDate cannot be after endDate',
      path: ['startDate'],
    }),
};

// 4. Customer Material Reconciliation Query Validation
export const customerReconciliationReportQuerySchema = {
  query: z
    .object({
      customerId: objectIdSchema.optional(),
      materialId: objectIdSchema.optional(),
      startDate: z.coerce.date().optional(),
      endDate: z.coerce.date().optional(),
      inboundChallanId: objectIdSchema.optional(),
      workOrderId: objectIdSchema.optional(),
      productionOrderId: objectIdSchema.optional(),
      productionBatchId: objectIdSchema.optional(),
      warehouseId: objectIdSchema.optional(),
      page: z.coerce.number().int().positive().default(1),
      limit: z.coerce.number().int().positive().max(200).default(50),
    })
    .refine(dateRangeRefine, {
      message: 'startDate cannot be after endDate',
      path: ['startDate'],
    }),
};

// 5. Work Order Report Query Validation
export const workOrderReportQuerySchema = {
  query: z
    .object({
      workOrderId: objectIdSchema.optional(),
      customerId: objectIdSchema.optional(),
      productId: objectIdSchema.optional(),
      status: z
        .enum([
          'DRAFT',
          'CONFIRMED',
          'IN_PROGRESS',
          'ON_HOLD',
          'COMPLETED',
          'CANCELLED',
          'APPROVED',
          'IN_PRODUCTION',
          'CLOSED',
        ])
        .optional(),
      priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']).optional(),
      startDate: z.coerce.date().optional(),
      endDate: z.coerce.date().optional(),
      search: z.string().trim().optional(),
      page: z.coerce.number().int().positive().default(1),
      limit: z.coerce.number().int().positive().max(100).default(20),
    })
    .refine(dateRangeRefine, {
      message: 'startDate cannot be after endDate',
      path: ['startDate'],
    }),
};

// 6. Production Batch Report Query Validation
export const productionBatchReportQuerySchema = {
  query: z
    .object({
      batchId: objectIdSchema.optional(),
      workOrderId: objectIdSchema.optional(),
      productionOrderId: objectIdSchema.optional(),
      processStageId: objectIdSchema.optional(),
      status: z.enum(['PENDING', 'IN_PROCESS', 'COMPLETED', 'HALTED', 'REJECTED']).optional(),
      startDate: z.coerce.date().optional(),
      endDate: z.coerce.date().optional(),
      search: z.string().trim().optional(),
      page: z.coerce.number().int().positive().default(1),
      limit: z.coerce.number().int().positive().max(100).default(20),
    })
    .refine(dateRangeRefine, {
      message: 'startDate cannot be after endDate',
      path: ['startDate'],
    }),
};

// 7. Finished Goods Report Query Validation
export const finishedGoodsReportQuerySchema = {
  query: z
    .object({
      workOrderId: objectIdSchema.optional(),
      customerId: objectIdSchema.optional(),
      productId: objectIdSchema.optional(),
      drumStatus: z
        .enum([
          'EMPTY',
          'AVAILABLE',
          'WINDING',
          'FILLED',
          'PACKED',
          'IN_TRANSIT',
          'DISPATCHED',
          'CUSTOMER_SITE',
          'RETURNED',
          'DAMAGED',
          'SCRAPPED',
          'CANCELLED',
        ])
        .optional(),
      warehouseId: objectIdSchema.optional(),
      startDate: z.coerce.date().optional(),
      endDate: z.coerce.date().optional(),
      search: z.string().trim().optional(),
      page: z.coerce.number().int().positive().default(1),
      limit: z.coerce.number().int().positive().max(100).default(20),
    })
    .refine(dateRangeRefine, {
      message: 'startDate cannot be after endDate',
      path: ['startDate'],
    }),
};

// 8. Packing & Dispatch Report Query Validation
export const packingDispatchReportQuerySchema = {
  query: z
    .object({
      customerId: objectIdSchema.optional(),
      workOrderId: objectIdSchema.optional(),
      status: z.string().trim().optional(),
      startDate: z.coerce.date().optional(),
      endDate: z.coerce.date().optional(),
      search: z.string().trim().optional(),
      page: z.coerce.number().int().positive().default(1),
      limit: z.coerce.number().int().positive().max(100).default(20),
    })
    .refine(dateRangeRefine, {
      message: 'startDate cannot be after endDate',
      path: ['startDate'],
    }),
};

// 9. Low Stock Report Query Validation
export const lowStockReportQuerySchema = {
  query: z.object({
    materialId: objectIdSchema.optional(),
    warehouseId: objectIdSchema.optional(),
    ownerType: z.enum(['FACTORY', 'CUSTOMER', 'FACTORY_OWNED', 'CUSTOMER_SUPPLIED']).optional(),
    customerId: objectIdSchema.optional(),
    status: z.enum(['ALL', 'BELOW_REORDER', 'OUT_OF_STOCK']).default('ALL'),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(200).default(50),
  }),
};

// 10. Traceability Query Validation
export const traceabilityReportQuerySchema = {
  query: z.object({
    search: z.string().trim().optional(),
    materialCode: z.string().trim().optional(),
    lotNumber: z.string().trim().optional(),
    lotId: objectIdSchema.optional(),
    inboundChallanNumber: z.string().trim().optional(),
    inboundChallanId: objectIdSchema.optional(),
    customerId: objectIdSchema.optional(),
    workOrderNumber: z.string().trim().optional(),
    workOrderId: objectIdSchema.optional(),
    productionOrderNumber: z.string().trim().optional(),
    productionOrderId: objectIdSchema.optional(),
    productionBatchNumber: z.string().trim().optional(),
    productionBatchId: objectIdSchema.optional(),
    drumNumber: z.string().trim().optional(),
    drumId: objectIdSchema.optional(),
    dispatchNumber: z.string().trim().optional(),
    dispatchId: objectIdSchema.optional(),
    outboundChallanNumber: z.string().trim().optional(),
    outboundChallanId: objectIdSchema.optional(),
    transactionNumber: z.string().trim().optional(),
    transactionId: objectIdSchema.optional(),
  }),
};

// 11. Discrepancies Query Validation
export const discrepanciesReportQuerySchema = {
  query: z.object({
    type: z.string().trim().optional(),
    severity: z.enum(['CRITICAL', 'WARNING', 'INFO']).optional(),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(200).default(50),
  }),
};

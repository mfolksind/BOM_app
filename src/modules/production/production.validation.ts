import { z } from 'zod';

const objectIdRegex = /^[0-9a-fA-F]{24}$/;
const objectIdSchema = z.string().regex(objectIdRegex, 'Invalid ObjectId');

export const createProductionOrderSchema = {
  params: z.object({
    id: objectIdSchema, // workOrderId
  }),
  body: z.object({
    plannedLengthMeters: z.number().positive().optional(),
    startDate: z.string().datetime({ offset: true }).or(z.string().date()).optional(),
    targetCompletionDate: z.string().datetime({ offset: true }).or(z.string().date()).optional(),
    remarks: z.string().trim().optional(),
  }),
};

export const listProductionOrdersQuerySchema = {
  query: z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
    workOrderId: objectIdSchema.optional(),
    customerId: objectIdSchema.optional(),
    productId: objectIdSchema.optional(),
    status: z.string().trim().optional(),
    search: z.string().trim().optional(),
  }),
};

export const productionOrderIdParamSchema = {
  params: z.object({
    id: objectIdSchema,
  }),
};

export const createProductionBatchSchema = {
  params: z.object({
    id: objectIdSchema, // productionOrderId
  }),
  body: z.object({
    processStageId: objectIdSchema,
    machineId: objectIdSchema.optional(),
    machineCode: z.string().trim().optional(),
    plannedQuantity: z.number().positive().optional(),
    unit: z.string().trim().default('METER'),
    shift: z.string().trim().optional(),
    operatorId: objectIdSchema.optional(),
    remarks: z.string().trim().optional(),
  }),
};

export const updateProductionBatchSchema = {
  params: z.object({
    id: objectIdSchema, // batchId
  }),
  body: z.object({
    status: z.string().trim().optional(),
    completedQuantity: z.number().min(0).optional(),
    remarks: z.string().trim().optional(),
  }),
};

export const createMaterialIssueSchema = {
  params: z.object({
    id: objectIdSchema, // productionOrderId
  }),
  body: z.object({
    sourceWarehouseId: objectIdSchema,
    destinationWarehouseId: objectIdSchema,
    processStageId: objectIdSchema.optional(),
    remarks: z.string().trim().optional(),
    lines: z
      .array(
        z.object({
          materialId: objectIdSchema,
          lotId: objectIdSchema.optional(),
          ownerType: z
            .enum(['CUSTOMER', 'FACTORY', 'CUSTOMER_OWNED', 'FACTORY_OWNED'])
            .transform((val) =>
              val === 'CUSTOMER_OWNED' ? 'CUSTOMER' : val === 'FACTORY_OWNED' ? 'FACTORY' : val,
            )
            .optional(),
          customerId: objectIdSchema.optional(),
          issuedQuantity: z.number().positive('Issued quantity must be positive'),
          unit: z.string().trim().default('KG').optional(),
          remarks: z.string().trim().optional(),
        }),
      )
      .optional()
      .default([]),
  }),
};

export const listMaterialIssuesQuerySchema = {
  query: z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
    productionOrderId: objectIdSchema.optional(),
    workOrderId: objectIdSchema.optional(),
    status: z.string().trim().optional(),
  }),
};

export const createMaterialConsumptionSchema = {
  params: z.object({
    id: objectIdSchema, // batchId
  }),
  body: z.object({
    materialId: objectIdSchema,
    lotId: objectIdSchema.optional(),
    ownerType: z
      .enum(['CUSTOMER', 'FACTORY', 'CUSTOMER_OWNED', 'FACTORY_OWNED'])
      .transform((val) =>
        val === 'CUSTOMER_OWNED' ? 'CUSTOMER' : val === 'FACTORY_OWNED' ? 'FACTORY' : val,
      )
      .optional(),
    customerId: objectIdSchema.optional(),
    warehouseId: objectIdSchema, // WIP warehouse
    consumedQuantity: z.number().positive('Consumed quantity must be positive'),
    unit: z.string().trim().default('KG').optional(),
    remarks: z.string().trim().optional(),
  }),
};

export const createMaterialReturnSchema = {
  params: z.object({
    id: objectIdSchema, // batchId
  }),
  body: z.object({
    materialId: objectIdSchema,
    lotId: objectIdSchema.optional(),
    ownerType: z
      .enum(['CUSTOMER', 'FACTORY', 'CUSTOMER_OWNED', 'FACTORY_OWNED'])
      .transform((val) =>
        val === 'CUSTOMER_OWNED' ? 'CUSTOMER' : val === 'FACTORY_OWNED' ? 'FACTORY' : val,
      )
      .optional(),
    customerId: objectIdSchema.optional(),
    sourceWarehouseId: objectIdSchema, // WIP warehouse
    destinationWarehouseId: objectIdSchema, // Store warehouse
    returnQuantity: z.number().positive('Return quantity must be positive'),
    unit: z.string().trim().default('KG').optional(),
    reason: z.string().trim().optional(),
  }),
};

export const createProductionOutputSchema = {
  params: z.object({
    id: objectIdSchema, // batchId
  }),
  body: z.object({
    outputLengthMeters: z.number().min(0).default(0).optional(),
    outputWeightKg: z.number().min(0).default(0).optional(),
    targetWarehouseId: objectIdSchema,
    isFinalStage: z.boolean().default(false),
    drumId: objectIdSchema.optional(),
    qualityStatus: z.string().trim().default('PASSED').optional(),
    testReportNumber: z.string().trim().optional(),
    remarks: z.string().trim().optional(),
  }),
};

export const createScrapRecordSchema = {
  params: z.object({
    id: objectIdSchema, // batchId
  }),
  body: z.object({
    materialId: objectIdSchema,
    lotId: objectIdSchema.optional(),
    ownerType: z
      .enum(['CUSTOMER', 'FACTORY', 'CUSTOMER_OWNED', 'FACTORY_OWNED'])
      .transform((val) =>
        val === 'CUSTOMER_OWNED' ? 'CUSTOMER' : val === 'FACTORY_OWNED' ? 'FACTORY' : val,
      )
      .optional(),
    customerId: objectIdSchema.optional(),
    scrapType: z.string().trim(),
    scrapCategory: z.string().trim().default('SALEABLE').optional(),
    scrapQuantity: z.number().positive('Scrap quantity must be positive'),
    unit: z.string().trim().default('KG').optional(),
    sourceWarehouseId: objectIdSchema, // WIP warehouse
    scrapWarehouseId: objectIdSchema,
    reason: z.string().trim().optional(),
  }),
};

export const createBulkMaterialConsumptionSchema = {
  params: z.object({
    id: objectIdSchema, // batchId
  }),
  body: z.object({
    warehouseId: objectIdSchema.optional(),
    ownerType: z
      .enum(['CUSTOMER', 'FACTORY', 'CUSTOMER_OWNED', 'FACTORY_OWNED'])
      .transform((val) =>
        val === 'CUSTOMER_OWNED' ? 'CUSTOMER' : val === 'FACTORY_OWNED' ? 'FACTORY' : val,
      )
      .optional(),
    items: z
      .array(
        z.object({
          materialId: objectIdSchema,
          lotId: objectIdSchema.optional(),
          ownerType: z
            .enum(['CUSTOMER', 'FACTORY', 'CUSTOMER_OWNED', 'FACTORY_OWNED'])
            .transform((val) =>
              val === 'CUSTOMER_OWNED' ? 'CUSTOMER' : val === 'FACTORY_OWNED' ? 'FACTORY' : val,
            )
            .optional(),
          customerId: objectIdSchema.optional(),
          warehouseId: objectIdSchema.optional(),
          consumedQuantity: z.number().positive('Consumed quantity must be positive'),
          unit: z.string().trim().default('KG').optional(),
          remarks: z.string().trim().optional(),
        }),
      )
      .min(1, 'At least one material must be provided for consumption'),
    autoCalculateScrap: z.boolean().default(false),
    scrapWarehouseId: objectIdSchema.optional(),
  }),
};

export const autoScrapSchema = {
  params: z.object({
    id: objectIdSchema, // batchId
  }),
  body: z.object({
    scrapWarehouseId: objectIdSchema,
    sourceWarehouseId: objectIdSchema.optional(),
    reason: z.string().trim().optional(),
  }),
};

export const reverseBatchSchema = {
  params: z.object({
    id: objectIdSchema, // batchId
  }),
  body: z.object({
    reason: z.string().trim().min(3, 'Reversal reason is required'),
    testReportNumber: z.string().trim().optional(),
    failedMeasurements: z.record(z.unknown()).optional(),
    returnUnusedWipToStore: z.boolean().default(false),
    storeWarehouseId: objectIdSchema.optional(),
    wipWarehouseId: objectIdSchema.optional(),
    remarks: z.string().trim().optional(),
  }),
};


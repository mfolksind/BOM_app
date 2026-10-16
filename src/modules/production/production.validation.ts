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
    targetCompletionDate: z.string().datetime({ offset: true }).or(z.string().date()),
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
    status: z
      .enum(['DRAFT', 'RELEASED', 'IN_PROGRESS', 'COMPLETED', 'HALTED', 'CANCELLED'])
      .optional(),
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
    machineCode: z.string().trim().min(1, 'Machine code is required'),
    plannedQuantity: z.number().positive('Planned quantity must be positive'),
    unit: z.string().trim().default('METER'),
    shift: z.enum(['SHIFT_A', 'SHIFT_B', 'SHIFT_C']).optional(),
    operatorId: objectIdSchema.optional(),
    remarks: z.string().trim().optional(),
  }),
};

export const updateProductionBatchSchema = {
  params: z.object({
    id: objectIdSchema, // batchId
  }),
  body: z.object({
    status: z.enum(['PENDING', 'IN_PROCESS', 'COMPLETED', 'HALTED', 'REJECTED']).optional(),
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
            ),
          customerId: objectIdSchema.optional(),
          issuedQuantity: z.number().positive('Issued quantity must be positive'),
          unit: z.string().trim().min(1, 'Unit is required'),
          remarks: z.string().trim().optional(),
        }),
      )
      .min(1, 'At least one material issue line is required'),
  }),
};

export const listMaterialIssuesQuerySchema = {
  query: z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
    productionOrderId: objectIdSchema.optional(),
    workOrderId: objectIdSchema.optional(),
    status: z.enum(['DRAFT', 'ISSUED', 'CANCELLED']).optional(),
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
      ),
    customerId: objectIdSchema.optional(),
    warehouseId: objectIdSchema, // WIP warehouse
    consumedQuantity: z.number().positive('Consumed quantity must be positive'),
    unit: z.string().trim().min(1, 'Unit is required'),
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
      ),
    customerId: objectIdSchema.optional(),
    sourceWarehouseId: objectIdSchema, // WIP warehouse
    destinationWarehouseId: objectIdSchema, // Store warehouse
    returnQuantity: z.number().positive('Return quantity must be positive'),
    unit: z.string().trim().min(1, 'Unit is required'),
    reason: z.string().trim().optional(),
  }),
};

export const createProductionOutputSchema = {
  params: z.object({
    id: objectIdSchema, // batchId
  }),
  body: z.object({
    outputLengthMeters: z.number().positive('Output length must be positive'),
    outputWeightKg: z.number().positive('Output weight must be positive'),
    targetWarehouseId: objectIdSchema,
    isFinalStage: z.boolean().default(false),
    drumId: objectIdSchema.optional(),
    qualityStatus: z.enum(['PASSED', 'PENDING', 'REJECTED']).default('PASSED'),
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
      ),
    customerId: objectIdSchema.optional(),
    scrapType: z.enum([
      'COPPER_SCRAP',
      'ALUMINUM_SCRAP',
      'PVC_LUMPS',
      'XLPE_LUMPS',
      'PROCESS_WASTE',
      'END_PIECES',
      'ARMOUR_WIRE_OFFCUTS',
    ]),
    scrapCategory: z.enum(['REUSABLE', 'SALEABLE', 'PROCESS_LOSS', 'REJECTED']).default('SALEABLE'),
    scrapQuantity: z.number().positive('Scrap quantity must be positive'),
    unit: z.string().trim().default('KG'),
    sourceWarehouseId: objectIdSchema, // WIP warehouse
    scrapWarehouseId: objectIdSchema,
    reason: z.string().trim().optional(),
  }),
};

import { z } from 'zod';

const objectIdRegex = /^[0-9a-fA-F]{24}$/;
const objectIdSchema = z.string().regex(objectIdRegex, 'Invalid ObjectId');

export const createDrumSchema = {
  body: z.object({
    drumNumber: z.string().trim().toUpperCase().optional(),
    drumType: z.string().trim().default('WOODEN'),
    drumSize: z.string().trim().optional(),
    refRgpNumber: z.string().trim().optional(),
    inboundChallanId: objectIdSchema.optional(),
    inboundChallanNumber: z.string().trim().optional(),
    receivedDate: z.string().datetime({ offset: true }).or(z.string().date()).optional(),
    serialNumber: z.string().trim().toUpperCase().optional(),
    flangeDiameterMm: z.number().min(0).optional(),
    barrelDiameterMm: z.number().min(0).optional(),
    traverseWidthMm: z.number().min(0).optional(),
    tareWeightKg: z.number().positive('Tare weight must be greater than 0'),
    grossWeightKg: z.number().min(0).default(0),
    netWeightKg: z.number().min(0).default(0),
    cableLengthMeters: z.number().min(0).default(0),
    currentProductId: objectIdSchema.optional(),
    workOrderId: objectIdSchema.optional(),
    productionOrderId: objectIdSchema.optional(),
    productionBatchId: objectIdSchema.optional(),
    productionOutputId: objectIdSchema.optional(),
    customerId: objectIdSchema.optional(),
    currentWarehouseId: objectIdSchema.optional(),
    location: z.string().trim().optional(),
    ownership: z.string().trim().default('FACTORY_OWNED'),
    status: z.string().trim().default('AVAILABLE'),
    remarks: z.string().trim().optional(),
  }),
};

export const receiveCustomerDrumsSchema = {
  body: z.object({
    customerId: objectIdSchema,
    customerChallanNumber: z.string().trim().min(1, 'Customer Challan / RGP Number is required'),
    customerChallanDate: z.string().datetime({ offset: true }).or(z.string().date()).optional(),
    warehouseId: objectIdSchema.optional(),
    vehicleNumber: z.string().trim().optional(),
    transporter: z.string().trim().optional(),
    lrNumber: z.string().trim().optional(),
    remarks: z.string().trim().optional(),
    quantity: z.coerce.number().int().positive().optional(),
    drumSize: z.string().trim().optional(),
    drumType: z.string().trim().optional(),
    tareWeightKg: z.coerce.number().positive().optional(),
    prefix: z.string().trim().optional(),
    drums: z
      .array(
        z.object({
          drumNumber: z.string().trim().toUpperCase().optional(),
          drumSize: z.string().trim().default('44X16X24'),
          drumType: z.string().trim().default('WOODEN'),
          serialNumber: z.string().trim().optional(),
          tareWeightKg: z.number().min(0).default(150),
          remarks: z.string().trim().optional(),
        }),
      )
      .optional(),
  }),
};

export const updateDrumSchema = {
  params: z.object({
    id: objectIdSchema,
  }),
  body: z.object({
    drumType: z.string().trim().optional(),
    drumSize: z.string().trim().optional(),
    refRgpNumber: z.string().trim().optional(),
    inboundChallanNumber: z.string().trim().optional(),
    serialNumber: z.string().trim().toUpperCase().optional(),
    flangeDiameterMm: z.number().min(0).optional(),
    barrelDiameterMm: z.number().min(0).optional(),
    traverseWidthMm: z.number().min(0).optional(),
    tareWeightKg: z.number().positive().optional(),
    grossWeightKg: z.number().min(0).optional(),
    netWeightKg: z.number().min(0).optional(),
    cableLengthMeters: z.number().min(0).optional(),
    currentProductId: objectIdSchema.optional(),
    workOrderId: objectIdSchema.optional(),
    customerId: objectIdSchema.optional(),
    currentWarehouseId: objectIdSchema.optional(),
    location: z.string().trim().optional(),
    status: z.string().trim().optional(),
    remarks: z.string().trim().optional(),
  }),
};

export const listDrumsQuerySchema = {
  query: z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(1000).default(20),
    status: z.string().trim().optional(),
    drumType: z.string().trim().optional(),
    ownership: z.string().trim().optional(),
    currentProductId: objectIdSchema.optional(),
    workOrderId: objectIdSchema.optional(),
    customerId: objectIdSchema.optional(),
    currentWarehouseId: objectIdSchema.optional(),
    search: z.string().trim().optional(),
  }),
};

export const drumIdParamSchema = {
  params: z.object({
    id: objectIdSchema,
  }),
};

export const createPackingListSchema = {
  body: z.object({
    workOrderId: objectIdSchema,
    customerId: objectIdSchema,
    productId: objectIdSchema.optional(),
    packingListNumber: z.string().trim().optional(),
    invoiceNumber: z.string().trim().optional(),
    challanNumber: z.string().trim().optional(),
    sizeDescription: z.string().trim().optional(),
    size: z.string().trim().optional(), // Alias for sizeDescription
    workOrderNumber: z.string().trim().optional(),
    workOrderDate: z.string().datetime({ offset: true }).or(z.string().date()).optional(),
    packingWarehouseId: objectIdSchema.optional(),
    packingDate: z.string().datetime({ offset: true }).or(z.string().date()).optional(),
    remarks: z.string().trim().optional(),
    lines: z
      .array(
        z.object({
          drumId: objectIdSchema.optional().or(z.literal('')),
          sNo: z.number().optional(),
          drumNumber: z.string().trim().optional(),
          lengthBottom: z.number().min(0).default(0),
          lengthTop: z.number().min(0).optional(),
          lengthTotal: z.number().min(0).optional(),
          drumSize: z.string().trim().optional(),
          refRgpNumber: z.string().trim().optional(),
          refRgpNo: z.string().trim().optional(), // Alias
          drumType: z.string().trim().optional(),
          productId: objectIdSchema.optional(),
          lengthMeters: z.number().positive().optional(),
          tareWeightKg: z.number().positive().optional(),
          netWeightKg: z.number().positive().optional(),
          grossWeightKg: z.number().positive().optional(),
          conductorResistanceOhmPerKm: z.number().min(0).optional(),
          insulationResistanceMOhmKm: z.number().min(0).optional(),
          highVoltageTestPassed: z.boolean().default(true),
          remarks: z.string().trim().optional(),
        }),
      )
      .min(1, 'At least one drum line is required in a packing list'),
  }),
};

export const updatePackingListSchema = {
  params: z.object({
    id: objectIdSchema,
  }),
  body: z.object({
    packingWarehouseId: objectIdSchema.optional(),
    packingDate: z.string().datetime({ offset: true }).or(z.string().date()).optional(),
    invoiceNumber: z.string().trim().optional(),
    challanNumber: z.string().trim().optional(),
    sizeDescription: z.string().trim().optional(),
    remarks: z.string().trim().optional(),
    lines: z
      .array(
        z.object({
          drumId: objectIdSchema.optional().or(z.literal('')),
          sNo: z.number().optional(),
          drumNumber: z.string().trim().optional(),
          lengthBottom: z.number().min(0).default(0),
          lengthTop: z.number().min(0).optional(),
          lengthTotal: z.number().min(0).optional(),
          drumSize: z.string().trim().optional(),
          refRgpNumber: z.string().trim().optional(),
          drumType: z.string().trim().optional(),
          productId: objectIdSchema.optional(),
          lengthMeters: z.number().positive().optional(),
          tareWeightKg: z.number().positive().optional(),
          netWeightKg: z.number().positive().optional(),
          grossWeightKg: z.number().positive().optional(),
          conductorResistanceOhmPerKm: z.number().min(0).optional(),
          insulationResistanceMOhmKm: z.number().min(0).optional(),
          highVoltageTestPassed: z.boolean().default(true),
          remarks: z.string().trim().optional(),
        }),
      )
      .optional(),
  }),
};

export const listPackingListsQuerySchema = {
  query: z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(1000).default(20),
    workOrderId: objectIdSchema.optional(),
    customerId: objectIdSchema.optional(),
    status: z.enum(['DRAFT', 'PACKED', 'COMPLETED', 'DISPATCHED', 'CANCELLED']).optional(),
    search: z.string().trim().optional(),
  }),
};

export const packingListIdParamSchema = {
  params: z.object({
    id: objectIdSchema,
  }),
};

export const cancelPackingListSchema = {
  params: z.object({
    id: objectIdSchema,
  }),
  body: z.object({
    reason: z.string().trim().min(3, 'Cancellation reason is required'),
  }),
};

export const generateChallanFromPackingListSchema = {
  params: z.object({
    id: objectIdSchema,
  }),
  body: z
    .object({
      challanNumber: z.string().trim().optional(),
      invoiceNumber: z.string().trim().optional(),
      vehicleNumber: z.string().trim().optional(),
      transporter: z.string().trim().optional(),
      lrNumber: z.string().trim().optional(),
      eWayBillNumber: z.string().trim().optional(),
      deliveryTerms: z.string().trim().optional(),
      remarks: z.string().trim().optional(),
    })
    .optional(),
};

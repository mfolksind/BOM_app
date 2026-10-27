import { z } from 'zod';
import mongoose from 'mongoose';

const objectIdSchema = z
  .string()
  .trim()
  .refine((val) => mongoose.Types.ObjectId.isValid(val), {
    message: 'Invalid ObjectId format',
  });

export const inventorySummaryQuerySchema = z.object({
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  materialId: objectIdSchema.optional(),
  warehouseId: objectIdSchema.optional(),
  ownerType: z.enum(['FACTORY', 'CUSTOMER', 'FACTORY_OWNED', 'CUSTOMER_OWNED']).optional(),
  customerId: objectIdSchema.optional(),
});

export const inventoryTransactionQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  materialId: objectIdSchema.optional(),
  warehouseId: objectIdSchema.optional(),
  ownerType: z.enum(['FACTORY', 'CUSTOMER', 'FACTORY_OWNED', 'CUSTOMER_OWNED']).optional(),
  customerId: objectIdSchema.optional(),
  transactionType: z.string().trim().optional(),
  sourceDocumentType: z.string().trim().optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
});

export const inventoryBalanceQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(50),
  materialId: objectIdSchema.optional(),
  warehouseId: objectIdSchema.optional(),
  ownerType: z.enum(['FACTORY', 'CUSTOMER', 'FACTORY_OWNED', 'CUSTOMER_OWNED']).optional(),
  customerId: objectIdSchema.optional(),
  lotId: objectIdSchema.optional(),
});

export const dailySummaryQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  date: z.coerce.date().optional(),
  materialId: objectIdSchema.optional(),
  warehouseId: objectIdSchema.optional(),
  ownerType: z.enum(['FACTORY', 'CUSTOMER', 'FACTORY_OWNED', 'CUSTOMER_OWNED']).optional(),
});

export const rebuildDailySummarySchema = z.object({
  date: z.coerce.date(),
});

export type InventorySummaryQueryParams = z.infer<typeof inventorySummaryQuerySchema>;
export type InventoryTransactionQueryParams = z.infer<typeof inventoryTransactionQuerySchema>;
export type InventoryBalanceQueryParams = z.infer<typeof inventoryBalanceQuerySchema>;
export type DailySummaryQueryParams = z.infer<typeof dailySummaryQuerySchema>;
export type RebuildDailySummaryInput = z.infer<typeof rebuildDailySummarySchema>;

import { z } from 'zod';
import mongoose from 'mongoose';

export const warehouseTypeEnum = z.string().trim();

const objectIdValidator = z.string().refine((val) => mongoose.Types.ObjectId.isValid(val), {
  message: 'Invalid ObjectId format',
});

export const createWarehouseSchema = z.object({
  code: z
    .string()
    .min(2, 'Warehouse code must be at least 2 characters')
    .max(30, 'Warehouse code cannot exceed 30 characters')
    .regex(/^[A-Z0-9_-]+$/i, 'Warehouse code contains invalid characters')
    .trim()
    .transform((val) => val.toUpperCase()),
  name: z.string().min(2, 'Warehouse name must be at least 2 characters').max(100).trim(),
  type: warehouseTypeEnum.default('RAW_MATERIAL').optional(),
  description: z.string().max(1000).trim().optional(),
  location: z.string().max(200).trim().optional(),
  address: z.string().max(500).trim().optional(),
  managerId: objectIdValidator.optional(),
  capacity: z.coerce.number().min(0, 'Capacity cannot be negative').optional(),
  isActive: z.boolean().default(true),
});

export const updateWarehouseSchema = z.object({
  name: z.string().min(2).max(100).trim().optional(),
  type: warehouseTypeEnum.optional(),
  description: z.string().max(1000).trim().optional(),
  location: z.string().max(200).trim().optional(),
  address: z.string().max(500).trim().optional(),
  managerId: objectIdValidator.nullable().optional(),
  capacity: z.coerce.number().min(0, 'Capacity cannot be negative').optional(),
});

export const updateWarehouseStatusSchema = z.object({
  isActive: z.boolean(),
  reason: z.string().max(500).trim().optional(),
});

export const warehouseQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().trim().optional(),
  type: warehouseTypeEnum.optional(),
  isActive: z
    .enum(['true', 'false'])
    .transform((val) => val === 'true')
    .optional(),
});

export type CreateWarehouseInput = z.infer<typeof createWarehouseSchema>;
export type UpdateWarehouseInput = z.infer<typeof updateWarehouseSchema>;
export type UpdateWarehouseStatusInput = z.infer<typeof updateWarehouseStatusSchema>;
export type WarehouseQueryParams = z.infer<typeof warehouseQuerySchema>;

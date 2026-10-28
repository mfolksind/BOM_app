import { z } from 'zod';

const objectIdRegex = /^[0-9a-fA-F]{24}$/;
const objectIdSchema = z.string().regex(objectIdRegex, 'Invalid ObjectId');

const customTestSchema = z.object({
  testName: z.string().trim().min(1, 'Test name is required'),
  testType: z.string().trim().optional(),
  unit: z.string().trim().optional(),
  standardSpecification: z.string().trim().optional(),
  minValue: z.coerce.number().optional(),
  maxValue: z.coerce.number().optional(),
  isMandatory: z.boolean().default(false),
});

export const createMachineSchema = {
  body: z.object({
    code: z
      .string()
      .min(2, 'Machine code must be at least 2 characters')
      .max(30, 'Machine code cannot exceed 30 characters')
      .trim()
      .transform((val) => val.toUpperCase()),
    name: z.string().min(2, 'Machine name must be at least 2 characters').max(100).trim(),
    processStageIds: z.array(objectIdSchema).optional().default([]),
    machineType: z.string().trim().optional(),
    status: z.enum(['AVAILABLE', 'RUNNING', 'MAINTENANCE', 'BREAKDOWN']).default('AVAILABLE'),
    capacityPerShift: z.coerce.number().min(0).optional(),
    speedMetersPerMinute: z.coerce.number().min(0).optional(),
    location: z.string().trim().optional(),
    specifications: z.record(z.unknown()).optional().default({}),
    customTests: z.array(customTestSchema).optional().default([]),
    isActive: z.boolean().default(true),
  }),
};

export const updateMachineSchema = {
  params: z.object({
    id: objectIdSchema,
  }),
  body: z.object({
    name: z.string().min(2).max(100).trim().optional(),
    processStageIds: z.array(objectIdSchema).optional(),
    machineType: z.string().trim().optional(),
    status: z.enum(['AVAILABLE', 'RUNNING', 'MAINTENANCE', 'BREAKDOWN']).optional(),
    capacityPerShift: z.coerce.number().min(0).optional(),
    speedMetersPerMinute: z.coerce.number().min(0).optional(),
    location: z.string().trim().optional(),
    specifications: z.record(z.unknown()).optional(),
    customTests: z.array(customTestSchema).optional(),
    isActive: z.boolean().optional(),
  }),
};

export const listMachinesQuerySchema = {
  query: z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(50),
    processStageId: objectIdSchema.optional(),
    status: z.enum(['AVAILABLE', 'RUNNING', 'MAINTENANCE', 'BREAKDOWN']).optional(),
    machineType: z.string().trim().optional(),
    search: z.string().trim().optional(),
    isActive: z
      .enum(['true', 'false'])
      .transform((val) => val === 'true')
      .optional(),
  }),
};

export const machineIdParamSchema = {
  params: z.object({
    id: objectIdSchema,
  }),
};

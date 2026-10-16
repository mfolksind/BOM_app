import { z } from 'zod';

export const createProcessStageSchema = z.object({
  code: z
    .string()
    .min(2, 'Stage code must be at least 2 characters')
    .max(30, 'Stage code cannot exceed 30 characters')
    .regex(/^[A-Z0-9_-]+$/i, 'Stage code contains invalid characters')
    .trim()
    .transform((val) => val.toUpperCase()),
  name: z.string().min(2, 'Stage name must be at least 2 characters').max(100).trim(),
  sequenceOrder: z.coerce.number().int().min(1, 'Sequence order must be at least 1'),
  category: z.string().max(50).trim().optional(),
  description: z.string().max(1000).trim().optional(),
  isActive: z.boolean().default(true),
});

export const updateProcessStageSchema = z
  .object({
    name: z.string().min(2).max(100).trim().optional(),
    sequenceOrder: z.coerce.number().int().min(1).optional(),
    category: z.string().max(50).trim().optional(),
    description: z.string().max(1000).trim().optional(),
  })
  .strict();

export const updateProcessStageStatusSchema = z.object({
  isActive: z.boolean(),
  reason: z.string().max(500).trim().optional(),
});

export const processStageQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  search: z.string().trim().optional(),
  category: z.string().trim().optional(),
  isActive: z
    .enum(['true', 'false'])
    .transform((val) => val === 'true')
    .optional(),
});

export type CreateProcessStageInput = z.infer<typeof createProcessStageSchema>;
export type UpdateProcessStageInput = z.infer<typeof updateProcessStageSchema>;
export type UpdateProcessStageStatusInput = z.infer<typeof updateProcessStageStatusSchema>;
export type ProcessStageQueryParams = z.infer<typeof processStageQuerySchema>;

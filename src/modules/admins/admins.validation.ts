import { z } from 'zod';

const departmentEnum = z.enum([
  'MANAGEMENT',
  'PRODUCTION',
  'STORES',
  'QUALITY',
  'DISPATCH',
  'MAINTENANCE',
  'ACCOUNTS',
]);

export const departmentSchema = z
  .preprocess(
    (val) => (typeof val === 'string' ? val.trim().toUpperCase() : val),
    departmentEnum,
  )
  .optional();

export const createAdminSchema = z.object({
  employeeCode: z
    .string()
    .trim()
    .min(2, 'Employee code must be at least 2 characters')
    .toUpperCase(),
  email: z.string().trim().email('Invalid email address format'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters long')
    .regex(/[a-zA-Z]/, 'Password must contain at least one letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  firstName: z.string().trim().min(1, 'First name is required'),
  lastName: z.string().trim().min(1, 'Last name is required'),
  phone: z.string().trim().optional(),
  department: departmentSchema,
});

export const updateAdminSchema = z.object({
  firstName: z.string().trim().min(1, 'First name cannot be empty').optional(),
  lastName: z.string().trim().min(1, 'Last name cannot be empty').optional(),
  phone: z.string().trim().optional(),
  department: departmentSchema,
});

export const updateAdminStatusSchema = z.object({
  isActive: z.boolean({ required_error: 'isActive status (true or false) is required' }),
  reason: z.string().trim().optional(),
});

export const resetAdminPasswordSchema = z.object({
  newPassword: z
    .string()
    .min(8, 'New password must be at least 8 characters long')
    .regex(/[a-zA-Z]/, 'New password must contain at least one letter')
    .regex(/[0-9]/, 'New password must contain at least one number'),
});

export const adminQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
  search: z.string().trim().optional(),
  isActive: z.enum(['true', 'false']).optional(),
  department: z.string().trim().optional(),
});

export type CreateAdminInput = z.infer<typeof createAdminSchema>;
export type UpdateAdminInput = z.infer<typeof updateAdminSchema>;
export type UpdateAdminStatusInput = z.infer<typeof updateAdminStatusSchema>;
export type ResetAdminPasswordInput = z.infer<typeof resetAdminPasswordSchema>;
export type AdminQueryParams = z.infer<typeof adminQuerySchema>;

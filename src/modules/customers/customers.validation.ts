import { z } from 'zod';

export const addressSchema = z.object({
  street: z.string().min(1, 'Street is required').trim(),
  city: z.string().min(1, 'City is required').trim(),
  state: z.string().min(1, 'State is required').trim(),
  postalCode: z.string().min(1, 'Postal code is required').trim(),
  country: z.string().trim().default('India'),
});

export const createCustomerSchema = z.object({
  code: z
    .string()
    .min(2, 'Customer code must be at least 2 characters')
    .max(20, 'Customer code cannot exceed 20 characters')
    .regex(
      /^[A-Z0-9_-]+$/i,
      'Customer code must only contain letters, numbers, hyphens, and underscores',
    )
    .trim()
    .transform((val) => val.toUpperCase()),
  name: z.string().min(2, 'Customer name must be at least 2 characters').max(100).trim(),
  legalName: z.string().max(150).trim().optional(),
  gstin: z
    .string()
    .regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/i, 'Invalid GSTIN format')
    .transform((val) => val.toUpperCase())
    .optional(),
  pan: z
    .string()
    .regex(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/i, 'Invalid PAN format')
    .transform((val) => val.toUpperCase())
    .optional(),
  contactPerson: z.string().min(2, 'Contact person must be at least 2 characters').max(100).trim(),
  email: z.string().email('Invalid email address').trim().toLowerCase(),
  phone: z.string().min(7, 'Phone number must be at least 7 digits').max(20).trim(),
  billingAddress: addressSchema,
  shippingAddresses: z.array(addressSchema).optional().default([]),
  jobWorkTerms: z.string().max(1000).trim().optional(),
  creditDays: z.coerce.number().int().min(0, 'Credit days cannot be negative').default(30),
  notes: z.string().max(2000).trim().optional(),
  isActive: z.boolean().default(true),
});

export const updateCustomerSchema = z
  .object({
    name: z.string().min(2).max(100).trim().optional(),
    legalName: z.string().max(150).trim().optional(),
    gstin: z
      .string()
      .regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/i, 'Invalid GSTIN format')
      .transform((val) => val.toUpperCase())
      .optional(),
    pan: z
      .string()
      .regex(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/i, 'Invalid PAN format')
      .transform((val) => val.toUpperCase())
      .optional(),
    contactPerson: z.string().min(2).max(100).trim().optional(),
    email: z.string().email('Invalid email address').trim().toLowerCase().optional(),
    phone: z.string().min(7).max(20).trim().optional(),
    billingAddress: addressSchema.optional(),
    shippingAddresses: z.array(addressSchema).optional(),
    jobWorkTerms: z.string().max(1000).trim().optional(),
    creditDays: z.coerce.number().int().min(0, 'Credit days cannot be negative').optional(),
    notes: z.string().max(2000).trim().optional(),
  })
  .strict();

export const updateCustomerStatusSchema = z.object({
  isActive: z.boolean(),
  reason: z.string().max(500).trim().optional(),
});

export const customerQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().trim().optional(),
  isActive: z
    .enum(['true', 'false'])
    .transform((val) => val === 'true')
    .optional(),
});

export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;
export type UpdateCustomerStatusInput = z.infer<typeof updateCustomerStatusSchema>;
export type CustomerQueryParams = z.infer<typeof customerQuerySchema>;

import { z } from 'zod';

/**
 * User Registration Validation Schema
 * Enforces valid email format, minimum 8 characters password, and proper role designation.
 */
export const registerSchema = z.object({
  body: z.object({
    name: z
      .string()
      .trim()
      .min(2, 'Name must be at least 2 characters')
      .max(100, 'Name cannot exceed 100 characters'),
    email: z
      .string()
      .trim()
      .toLowerCase()
      .min(1, 'Email address is required')
      .email('Please provide a valid email address'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters long')
      .max(128, 'Password cannot exceed 128 characters'),
    companyName: z
      .string()
      .trim()
      .optional()
      .nullable(),
    role: z
      .enum(['Company Admin', 'Employee', 'Support', 'Sales Agent', 'Super Admin'])
      .optional()
      .default('Company Admin'),
  }),
});

/**
 * User Login Validation Schema
 * Validates email format and ensures credentials are provided.
 */
export const loginSchema = z.object({
  body: z.object({
    email: z
      .string()
      .trim()
      .toLowerCase()
      .min(1, 'Email address is required')
      .email('Please provide a valid email address'),
    password: z
      .string()
      .min(1, 'Password is required'),
  }),
});

export type RegisterInput = z.infer<typeof registerSchema>['body'];
export type LoginInput = z.infer<typeof loginSchema>['body'];

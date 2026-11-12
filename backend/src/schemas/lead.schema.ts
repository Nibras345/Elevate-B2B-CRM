import { z } from 'zod';

/**
 * Lead Creation Validation Schema
 * Strictly validates contactName / name, companyName / company, and valid email format.
 */
export const createLeadSchema = z.object({
  body: z
    .object({
      contactName: z.string().trim().min(1, 'Contact name is required').optional(),
      name: z.string().trim().min(1, 'Contact name is required').optional(),
      companyName: z.string().trim().min(1, 'Company name is required').optional(),
      company: z.string().trim().min(1, 'Company name is required').optional(),
      email: z
        .string()
        .trim()
        .toLowerCase()
        .min(1, 'Email address is required')
        .email('Please provide a valid email address'),
      phone: z.string().trim().optional().default(''),
      country: z.string().trim().optional().default(''),
      estimatedValue: z.coerce.number().min(0, 'Estimated value cannot be negative').optional(),
      value: z.coerce.number().min(0, 'Estimated value cannot be negative').optional(),
      priority: z.enum(['Low', 'Medium', 'High', 'Urgent']).optional().default('Medium'),
      stage: z
        .enum(['New Lead', 'Contacted', 'Proposal Sent', 'Negotiation', 'Won / Closed'])
        .optional()
        .default('New Lead'),
      notes: z.string().optional().default(''),
      tags: z.array(z.string()).optional().default(['Enterprise']),
      assignedTo: z
        .object({
          id: z.string().optional(),
          name: z.string().optional(),
          avatar: z.string().optional(),
          role: z.string().optional(),
        })
        .optional(),
      expectedClose: z.string().optional().default(''),
    })
    .refine((data) => Boolean(data.contactName || data.name), {
      message: 'Contact name is required',
      path: ['contactName'],
    })
    .refine((data) => Boolean(data.companyName || data.company), {
      message: 'Company name is required',
      path: ['companyName'],
    }),
});

/**
 * Lead Update Validation Schema
 * Allows partial updates (e.g. stage transition in Kanban) and full editing.
 */
export const updateLeadSchema = z.object({
  body: z.object({
    contactName: z.string().trim().min(1, 'Contact name cannot be empty').optional(),
    name: z.string().trim().min(1, 'Contact name cannot be empty').optional(),
    companyName: z.string().trim().min(1, 'Company name cannot be empty').optional(),
    company: z.string().trim().min(1, 'Company name cannot be empty').optional(),
    email: z
      .string()
      .trim()
      .toLowerCase()
      .min(1, 'Email address is required')
      .email('Please provide a valid email address')
      .optional(),
    phone: z.string().trim().optional(),
    country: z.string().trim().optional(),
    estimatedValue: z.coerce.number().min(0, 'Estimated value cannot be negative').optional(),
    value: z.coerce.number().min(0, 'Estimated value cannot be negative').optional(),
    priority: z.enum(['Low', 'Medium', 'High', 'Urgent']).optional(),
    stage: z
      .enum(['New Lead', 'Contacted', 'Proposal Sent', 'Negotiation', 'Won / Closed'])
      .optional(),
    notes: z.string().optional(),
    tags: z.array(z.string()).optional(),
    assignedTo: z
      .object({
        id: z.string().optional(),
        name: z.string().optional(),
        avatar: z.string().optional(),
        role: z.string().optional(),
      })
      .optional(),
    expectedClose: z.string().optional(),
  }),
  params: z
    .object({
      id: z.string().min(1, 'Lead ID is required in URL parameter'),
    })
    .optional(),
});

export type CreateLeadInput = z.infer<typeof createLeadSchema>['body'];
export type UpdateLeadInput = z.infer<typeof updateLeadSchema>['body'];

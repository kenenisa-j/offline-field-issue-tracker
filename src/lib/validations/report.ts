import { z } from 'zod';

export const reportCategorySchema = z.enum([
    'WATER_POINT',
    'EQUIPMENT',
    'SERVICE_INTERRUPTION',
    'SAFETY',
    'MAINTENANCE',
    'OTHER',
]);

export const reportPrioritySchema = z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']);

export const reportStatusSchema = z.enum([
    'DRAFT',
    'SUBMITTED',
    'ASSIGNED',
    'IN_PROGRESS',
    'RESOLVED',
    'REJECTED',
]);

export const syncStatusSchema = z.enum(['PENDING', 'SYNCED', 'FAILED']);

export const reportSchema = z.object({
    id: z.union([z.string(), z.number()]).optional(),
    clientId: z.string().uuid('Invalid client identifier format'),
    category: reportCategorySchema,
    description: z
        .string()
        .trim()
        .min(1, 'Description is required')
        .max(2000, 'Description cannot exceed 2000 characters'),
    location: z
        .string()
        .trim()
        .min(1, 'Location is required')
        .max(255, 'Location name is too long'),
    priority: reportPrioritySchema,
    status: reportStatusSchema,
    reportedAt: z.string().datetime('Invalid reported date format'),
    createdAt: z.string().datetime('Invalid creation date format'),
    updatedAt: z.string().datetime('Invalid update date format'),
    syncStatus: syncStatusSchema.optional().default('PENDING'),
    syncError: z.string().nullable().optional(),
    version: z.number().int().nonnegative(),
});

export type CreateReportInput = z.infer<typeof reportSchema>;
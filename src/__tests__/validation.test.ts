import { describe, it, expect } from 'vitest';
import { z } from 'zod';

// Replicate or import your report validation schema
const reportValidationSchema = z.object({
    category: z.string().min(1, 'Category is required'),
    description: z.string().min(1, 'Description is required'),
    location: z.string().min(1, 'Location is required'),
    priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT'], {
        message: 'Invalid priority level',
    }),
});

describe('Report Input Validation', () => {
    it('should accept valid report payload', () => {
        const validData = {
            category: 'Electrical',
            description: 'Transformer sparked near substation B',
            location: 'Zone 4',
            priority: 'HIGH',
        };
        const result = reportValidationSchema.safeParse(validData);
        expect(result.success).toBe(true);
    });

    it('should fail on empty category', () => {
        const invalidData = {
            category: '',
            description: 'Transformer sparked',
            location: 'Zone 4',
            priority: 'HIGH',
        };
        const result = reportValidationSchema.safeParse(invalidData);
        expect(result.success).toBe(false);
    });

    it('should fail on empty description', () => {
        const invalidData = {
            category: 'Electrical',
            description: '',
            location: 'Zone 4',
            priority: 'MEDIUM',
        };
        const result = reportValidationSchema.safeParse(invalidData);
        expect(result.success).toBe(false);
    });

    it('should fail on invalid priority', () => {
        const invalidData = {
            category: 'Electrical',
            description: 'Transformer sparked',
            location: 'Zone 4',
            priority: 'CRITICAL_EXTREME', // Invalid enum value
        };
        const result = reportValidationSchema.safeParse(invalidData);
        expect(result.success).toBe(false);
    });
});
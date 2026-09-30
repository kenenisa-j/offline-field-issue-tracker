import { describe, it, expect } from 'vitest';
import { canTransition, assertValidTransition } from './transitions';

describe('Report Workflow Transitions', () => {
    it('allows valid transitions', () => {
        expect(canTransition('DRAFT', 'SUBMITTED')).toBe(true);
        expect(canTransition('SUBMITTED', 'ASSIGNED')).toBe(true);
        expect(canTransition('SUBMITTED', 'REJECTED')).toBe(true);
        expect(canTransition('ASSIGNED', 'IN_PROGRESS')).toBe(true);
        expect(canTransition('IN_PROGRESS', 'RESOLVED')).toBe(true);
    });

    it('rejects invalid transitions like RESOLVED -> DRAFT', () => {
        expect(canTransition('RESOLVED', 'DRAFT')).toBe(false);
        expect(canTransition('RESOLVED', 'SUBMITTED')).toBe(false);
        expect(canTransition('REJECTED', 'DRAFT')).toBe(false);
        expect(canTransition('DRAFT', 'RESOLVED')).toBe(false);
    });

    it('throws an error on assertValidTransition for illegal moves', () => {
        expect(() => assertValidTransition('RESOLVED', 'DRAFT')).toThrowError(
            'Invalid status transition from RESOLVED to DRAFT'
        );
    });
});
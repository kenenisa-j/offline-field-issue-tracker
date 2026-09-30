import { describe, it, expect } from 'vitest';

// Define the state transition validation logic (or import from your backend/lib if already defined)
function isValidStateTransition(from: string, to: string): boolean {
    const allowedTransitions: Record<string, string[]> = {
        DRAFT: ['SUBMITTED', 'REJECTED'],
        SUBMITTED: ['ASSIGNED', 'REJECTED'],
        ASSIGNED: ['IN_PROGRESS', 'REJECTED'],
        IN_PROGRESS: ['RESOLVED', 'REJECTED'],
        RESOLVED: [], // Terminal state
        REJECTED: [], // Terminal state
    };

    return allowedTransitions[from]?.includes(to) ?? false;
}

describe('Report Lifecycle State Machine', () => {
    it('allows valid transition from DRAFT to SUBMITTED', () => {
        const isValid = isValidStateTransition('DRAFT', 'SUBMITTED');
        expect(isValid).toBe(true);
    });

    it('allows valid transition from SUBMITTED to ASSIGNED', () => {
        const isValid = isValidStateTransition('SUBMITTED', 'ASSIGNED');
        expect(isValid).toBe(true);
    });

    it('rejects invalid transition from RESOLVED to DRAFT', () => {
        const isValid = isValidStateTransition('RESOLVED', 'DRAFT');
        expect(isValid).toBe(false);
    });

    it('rejects forbidden backward transitions in general', () => {
        expect(isValidStateTransition('IN_PROGRESS', 'SUBMITTED')).toBe(false);
        expect(isValidStateTransition('RESOLVED', 'IN_PROGRESS')).toBe(false);
    });
});
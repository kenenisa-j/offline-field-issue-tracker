import { ReportStatus } from '@/types/report';

const VALID_TRANSITIONS: Record<ReportStatus, ReportStatus[]> = {
    DRAFT: ['SUBMITTED'],
    SUBMITTED: ['ASSIGNED', 'REJECTED'],
    ASSIGNED: ['IN_PROGRESS'],
    IN_PROGRESS: ['RESOLVED'],
    RESOLVED: [], // Terminal state
    REJECTED: [], // Terminal state
};

/**
 * Checks if a status transition from one state to another is allowed.
 */
export function canTransition(from: ReportStatus, to: ReportStatus): boolean {
    const allowed = VALID_TRANSITIONS[from];
    return allowed ? allowed.includes(to) : false;
}

/**
 * Asserts that a status transition is valid, throwing an error if illegal.
 */
export function assertValidTransition(from: ReportStatus, to: ReportStatus): void {
    if (!canTransition(from, to)) {
        throw new Error(`Invalid status transition from ${from} to ${to}`);
    }
}
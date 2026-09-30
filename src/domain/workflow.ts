import { ReportStatus } from '@/types/report';

// Define allowed transitions map
const VALID_TRANSITIONS: Record<ReportStatus, ReportStatus[]> = {
    DRAFT: ['SUBMITTED'],
    SUBMITTED: ['ASSIGNED', 'REJECTED'],
    ASSIGNED: ['IN_PROGRESS'],
    IN_PROGRESS: ['RESOLVED'],
    RESOLVED: [], // Terminal state
    REJECTED: [], // Terminal state
};

export function canTransition(currentStatus: ReportStatus, nextStatus: ReportStatus): boolean {
    const allowed = VALID_TRANSITIONS[currentStatus];
    return allowed ? allowed.includes(nextStatus) : false;
}

export function assertValidTransition(currentStatus: ReportStatus, nextStatus: ReportStatus): void {
    if (!canTransition(currentStatus, nextStatus)) {
        throw new Error(`Invalid status transition from ${currentStatus} to ${nextStatus}`);
    }
}
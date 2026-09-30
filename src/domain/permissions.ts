import { ReportStatus } from '@/types/report';

export type UserRole = 'FIELD_WORKER' | 'COORDINATOR';

export interface UserContext {
    id: string;
    role: UserRole;
    // If we want to restrict field workers to their own reports later:
    assignedTo?: string;
}

export const PERMISSIONS = {
    FIELD_WORKER: {
        canCreate: true,
        canEditDraft: true,
        canSubmit: true,
        canViewAll: false, // View own reports only
    },
    COORDINATOR: {
        canCreate: false,
        canEditDraft: false,
        canSubmit: false,
        canViewAll: true,
        canAssign: true,
        canReject: true,
        canProgress: true,
        canResolve: true,
    },
};

export function canPerformAction(
    role: UserRole,
    action: 'CREATE' | 'EDIT_DRAFT' | 'SUBMIT' | 'ASSIGN' | 'REJECT' | 'PROGRESS' | 'RESOLVE' | 'VIEW_ALL'
): boolean {
    switch (role) {
        case 'FIELD_WORKER':
            return ['CREATE', 'EDIT_DRAFT', 'SUBMIT'].includes(action);
        case 'COORDINATOR':
            return ['ASSIGN', 'REJECT', 'PROGRESS', 'RESOLVE', 'VIEW_ALL'].includes(action);
        default:
            return false;
    }
}
import Dexie, { type Table } from 'dexie';
import { ReportStatus, SyncStatus, ReportCategory, ReportPriority } from '@/types/report';

export interface LocalReport {
    id?: number;              // Local auto-incremented primary key
    clientId: string;         // Unique UUID for idempotency & offline tracking
    category: ReportCategory;
    description: string;
    location: string;
    priority: ReportPriority;
    status: ReportStatus;
    reportedAt: string;       // ISO string format
    createdAt: string;
    updatedAt: string;
    syncStatus: SyncStatus;   // 'PENDING' | 'SYNCED' | 'FAILED'
    syncError?: string | null;
    version: number;
}

export interface LocalHistoryEvent {
    id?: number;
    reportId?: number;        // Local report primary key reference
    clientId: string;         // Client UUID reference
    eventType: 'CREATED' | 'SUBMITTED' | 'SYNC_ATTEMPTED' | 'SYNC_FAILED' | 'SYNCED' | string;
    message?: string;
    createdAt: string;
}

export class FieldIssueDB extends Dexie {
    reports!: Table<LocalReport, number>;
    history!: Table<LocalHistoryEvent, number>;

    constructor() {
        super('FieldIssueDB');
        // Bumped to version 2 to introduce the local history table
        this.version(2).stores({
            reports: '++id, clientId, status, syncStatus, category, createdAt',
            history: '++id, reportId, clientId, eventType, createdAt',
        });
    }
}

export const localDb = new FieldIssueDB();
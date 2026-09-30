export type ReportCategory =
    | 'WATER_POINT'
    | 'EQUIPMENT'
    | 'SERVICE_INTERRUPTION'
    | 'SAFETY'
    | 'MAINTENANCE'
    | 'OTHER';

export type ReportPriority =
    | 'LOW'
    | 'MEDIUM'
    | 'HIGH'
    | 'CRITICAL';

export type ReportStatus =
    | 'DRAFT'
    | 'SUBMITTED'
    | 'ASSIGNED'
    | 'IN_PROGRESS'
    | 'RESOLVED'
    | 'REJECTED';

export type SyncStatus = 'PENDING' | 'SYNCED' | 'FAILED';

export interface Report {
    // --- Business Fields ---
    id?: number | string;     // Server-side identifier (optional for offline drafts)
    clientId: string;         // Client-generated UUID (Ensures absolute idempotency during sync)
    category: ReportCategory;
    description: string;
    location: string;         // Text description (e.g., "Warehouse B - Sector 4")
    priority: ReportPriority;
    status: ReportStatus;
    reportedAt: string;       // ISO string when the issue was observed
    createdAt: string;       // ISO string when record was created locally
    updatedAt: string;       // ISO string when record was last modified

    // --- Synchronization & Offline Metadata ---
    syncStatus: SyncStatus;   // Tracks local offline state ('PENDING' | 'SYNCED' | 'FAILED')
    syncError?: string | null;// Captures sync failure messages for UI retry buttons
    version: number;          // Optimistic locking version counter
}
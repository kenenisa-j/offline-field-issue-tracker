import { localDb, LocalReport } from '@/db/dexie';
import { CreateReportInput } from '@/lib/validations/report';

export type CreateLocalReportInput = Omit<
    CreateReportInput,
    'clientId' | 'syncStatus' | 'version' | 'createdAt' | 'updatedAt' | 'reportedAt' | 'status'
> & {
    reportedAt?: string;
    status?: CreateReportInput['status'];
};

export async function createLocalReport(
    input: CreateLocalReportInput
): Promise<LocalReport> {
    // 1. Generate unique client UUID for offline idempotency
    const clientId = crypto.randomUUID();
    const now = new Date().toISOString();

    // 2. Create report object with PENDING sync status
    const newReport: LocalReport = {
        clientId,
        category: input.category,
        description: input.description,
        location: input.location,
        priority: input.priority,
        status: input.status || 'DRAFT',
        reportedAt: input.reportedAt || now,
        createdAt: now,
        updatedAt: now,
        syncStatus: 'PENDING',
        syncError: null,
        version: 1,
    };

    // 3. Save to IndexedDB locally BEFORE network synchronization
    const id = await localDb.reports.add(newReport);
    const savedReport = { ...newReport, id };

    // 4. Log local history event
    await localDb.history.add({
        reportId: id,
        clientId,
        eventType: 'CREATED',
        message: 'Report created locally in Dexie',
        createdAt: now,
    });

    return savedReport;
}
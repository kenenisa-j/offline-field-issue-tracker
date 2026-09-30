import { describe, it, expect, beforeEach, vi } from 'vitest';
import 'fake-indexeddb/auto';
import { localDb } from '@/db/dexie';
import { createLocalReport } from '@/services/localReportService';
import { syncSingleReport } from '@/services/syncService';

describe('Synchronization Retry Flow', () => {
    beforeEach(async () => {
        await localDb.reports.clear();
        await localDb.history.clear();
        vi.restoreAllMocks();
    });

    it('should successfully transition a failed report to SYNCED upon network recovery and retry', async () => {
        // 1. Create a local report and force an initial failure (FAILED state)
        const savedReport = await createLocalReport({
            category: 'SERVICE_INTERRUPTION',
            description: 'Fiber cable damaged during excavation',
            location: 'Sector 9',
            priority: 'CRITICAL',
        });

        global.fetch = vi.fn().mockRejectedValueOnce(new Error('Network offline'));
        await syncSingleReport(savedReport);

        const failedReport = await localDb.reports.get(savedReport.id!);
        expect(failedReport?.syncStatus).toBe('FAILED');

        // 2. Simulate network recovery (connection restored) & trigger retry
        global.fetch = vi.fn().mockResolvedValueOnce({
            ok: true,
            json: async () => ({ success: true }),
        } as Response);

        const retrySuccess = await syncSingleReport(failedReport!);
        expect(retrySuccess).toBe(true);

        // 3. Verify report syncStatus is updated to SYNCED in Dexie
        const syncedReport = await localDb.reports.get(savedReport.id!);
        expect(syncedReport?.syncStatus).toBe('SYNCED');
        expect(syncedReport?.syncError).toBeNull();

        // 4. Verify audit history logs reflect the complete retry lifecycle
        const historyLogs = await localDb.history
            .where('reportId')
            .equals(savedReport.id!)
            .sortBy('createdAt');

        const eventTypes = historyLogs.map((log) => log.eventType);
        expect(eventTypes).toContain('CREATED');
        expect(eventTypes).toContain('SYNC_FAILED');
        expect(eventTypes).toContain('SYNCED');
    });
});
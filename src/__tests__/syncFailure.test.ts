import { describe, it, expect, beforeEach, vi } from 'vitest';
import 'fake-indexeddb/auto';
import { localDb } from '@/db/dexie';
import { createLocalReport } from '@/services/localReportService';
import { syncSingleReport } from '@/services/syncService';

describe('Failed Synchronization & Local Retention', () => {
    beforeEach(async () => {
        await localDb.reports.clear();
        await localDb.history.clear();
        vi.restoreAllMocks();
    });

    it('should transition a report to FAILED when the server is unavailable and keep it locally', async () => {
        // 1. Create a local report (Status: PENDING)
        const savedReport = await createLocalReport({
            category: 'SAFETY',
            description: 'Slippery floor near cafeteria exit',
            location: 'Block C',
            priority: 'MEDIUM',
        });

        expect(savedReport.syncStatus).toBe('PENDING');

        // 2. Mock global.fetch to simulate a network outage / server unavailable
        global.fetch = vi.fn().mockRejectedValue(new Error('Network Error: Server Unavailable'));

        // 3. Trigger synchronization
        const success = await syncSingleReport(savedReport);
        expect(success).toBe(false);

        // 4. Verify local report syncStatus is updated to FAILED and remains in Dexie
        const failedReport = await localDb.reports.get(savedReport.id!);
        expect(failedReport).toBeDefined();
        expect(failedReport?.id).toBe(savedReport.id);
        expect(failedReport?.syncStatus).toBe('FAILED');
        expect(failedReport?.syncError).toBeDefined();

        // 5. Verify audit history logs record the failure lifecycle
        const historyLogs = await localDb.history
            .where('reportId')
            .equals(savedReport.id!)
            .sortBy('createdAt');

        const eventTypes = historyLogs.map((log) => log.eventType);
        expect(eventTypes).toContain('CREATED');
        expect(eventTypes).toContain('SYNC_ATTEMPTED');
        expect(eventTypes).toContain('SYNC_FAILED');
    });
});
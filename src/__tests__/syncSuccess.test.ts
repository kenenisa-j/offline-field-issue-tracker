import { describe, it, expect, beforeEach, vi } from 'vitest';
import 'fake-indexeddb/auto';
import { localDb } from '@/db/dexie';
import { createLocalReport } from '@/services/localReportService';
import { syncSingleReport } from '@/services/syncService';

describe('Successful Synchronization Flow', () => {
    beforeEach(async () => {
        await localDb.reports.clear();
        await localDb.history.clear();
        vi.restoreAllMocks();
    });

    it('should transition a report from PENDING to SYNCED upon successful sync', async () => {
        // 1. Create a local report (Status: PENDING)
        const savedReport = await createLocalReport({
            category: 'MAINTENANCE',
            description: 'Broken gate latch at entry point',
            location: 'Main Gate',
            priority: 'MEDIUM',
        });

        expect(savedReport.syncStatus).toBe('PENDING');

        // 2. Mock global.fetch to simulate a successful backend response
        global.fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({ success: true }),
        } as Response);

        // 3. Trigger synchronization
        const success = await syncSingleReport(savedReport);
        expect(success).toBe(true);

        // 4. Verify local report syncStatus is updated to SYNCED in Dexie
        const updatedReport = await localDb.reports.get(savedReport.id!);
        expect(updatedReport?.syncStatus).toBe('SYNCED');
        expect(updatedReport?.syncError).toBeNull();

        // 5. Verify audit history logs reflect the successful sync lifecycle
        const historyLogs = await localDb.history
            .where('reportId')
            .equals(savedReport.id!)
            .sortBy('createdAt');

        const eventTypes = historyLogs.map((log) => log.eventType);
        expect(eventTypes).toContain('CREATED');
        expect(eventTypes).toContain('SYNC_ATTEMPTED');
        expect(eventTypes).toContain('SYNCED');
    });
});
import { describe, it, expect, beforeEach, vi } from 'vitest';
import 'fake-indexeddb/auto';
import { localDb } from '@/db/dexie';
import { createLocalReport } from '@/services/localReportService';
import { syncSingleReport } from '@/services/syncService';

describe('Audit History Logging', () => {
    beforeEach(async () => {
        await localDb.reports.clear();
        await localDb.history.clear();
        vi.restoreAllMocks();
    });

    it('should record comprehensive audit history events across the report lifecycle', async () => {
        // 1. Create a local report -> Should log CREATED event
        const savedReport = await createLocalReport({
            category: 'SAFETY',
            description: 'Blocked fire exit in corridor',
            location: 'Floor 3',
            priority: 'CRITICAL',
        });

        let historyLogs = await localDb.history
            .where('reportId')
            .equals(savedReport.id!)
            .sortBy('createdAt');

        expect(historyLogs.length).toBeGreaterThan(0);
        expect(historyLogs.some((log) => log.eventType === 'CREATED')).toBe(true);

        // 2. Simulate sync failure -> Should log failure / attempt event
        global.fetch = vi.fn().mockRejectedValueOnce(new Error('Network timeout'));
        await syncSingleReport(savedReport);

        historyLogs = await localDb.history
            .where('reportId')
            .equals(savedReport.id!)
            .sortBy('createdAt');

        const hasFailureLog = historyLogs.some(
            (log) => log.eventType.includes('FAIL') || log.eventType.includes('ATTEMPT')
        );
        expect(hasFailureLog).toBe(true);

        // 3. Simulate sync recovery & success -> Should log SYNCED event
        global.fetch = vi.fn().mockResolvedValueOnce({
            ok: true,
            json: async () => ({ success: true }),
        } as Response);

        const failedReport = await localDb.reports.get(savedReport.id!);
        await syncSingleReport(failedReport!);

        historyLogs = await localDb.history
            .where('reportId')
            .equals(savedReport.id!)
            .sortBy('createdAt');

        expect(historyLogs.some((log) => log.eventType === 'SYNCED')).toBe(true);
    });
});
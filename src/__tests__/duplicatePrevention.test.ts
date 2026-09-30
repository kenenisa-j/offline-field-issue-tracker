import { describe, it, expect, beforeEach, vi } from 'vitest';
import 'fake-indexeddb/auto';
import { localDb } from '@/db/dexie';
import { createLocalReport } from '@/services/localReportService';
import { syncSingleReport } from '@/services/syncService';

describe('Idempotency & Duplicate Prevention', () => {
    beforeEach(async () => {
        await localDb.reports.clear();
        await localDb.history.clear();
        vi.restoreAllMocks();
    });

    it('should handle syncing the same report twice idempotently using its clientId', async () => {
        // 1. Create a local report with a unique client-side identifier
        const savedReport = await createLocalReport({
            category: 'SERVICE_INTERRUPTION',
            description: 'Substation breaker tripped twice',
            location: 'Station Alpha',
            priority: 'CRITICAL',
        });

        const receivedPayloads: any[] = [];
        global.fetch = vi.fn().mockImplementation(async (_, options) => {
            const body = options?.body ? JSON.parse(options.body) : null;
            if (body) {
                receivedPayloads.push(body);
            }
            return {
                ok: true,
                json: async () => ({ success: true }),
            } as Response;
        });

        // 2. Sync for the first time
        const firstSync = await syncSingleReport(savedReport);
        expect(firstSync).toBe(true);

        // 3. Sync the exact same report a second time (simulating duplicate sync trigger)
        const secondSync = await syncSingleReport(savedReport);
        expect(secondSync).toBe(true);

        // 4. Verify both requests transmitted the same unique clientId for server-side deduplication / upsert
        expect(receivedPayloads.length).toBe(2);
        expect(receivedPayloads[0].clientId).toBe(savedReport.clientId);
        expect(receivedPayloads[1].clientId).toBe(savedReport.clientId);

        // 5. Verify local database state remains clean and SYNCED
        const finalReport = await localDb.reports.get(savedReport.id!);
        expect(finalReport?.syncStatus).toBe('SYNCED');
    });
});
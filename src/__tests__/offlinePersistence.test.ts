import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { localDb } from '@/db/dexie';
import { createLocalReport } from '@/services/localReportService';

describe('Offline Persistence & Dexie Storage', () => {
    beforeEach(async () => {
        // Clear the local database before each test to ensure a clean state
        await localDb.reports.clear();
        await localDb.history.clear();
    });

    it('should successfully persist a newly created report to IndexedDB', async () => {
        const input = {
            category: 'SAFETY' as const,
            description: 'Exposed wiring near generator shed',
            location: 'Site B',
            priority: 'HIGH' as const,
        };

        // 1. Create the report locally (offline action)
        const savedReport = await createLocalReport(input);

        expect(savedReport.id).toBeDefined();
        expect(savedReport.syncStatus).toBe('PENDING');

        // 2. Query IndexedDB directly to verify persistence
        const storedReport = await localDb.reports.get(savedReport.id!);

        expect(storedReport).toBeDefined();
        expect(storedReport?.category).toBe('SAFETY');
        expect(storedReport?.description).toBe('Exposed wiring near generator shed');
        expect(storedReport?.syncStatus).toBe('PENDING');

        // 3. Verify that an audit history log was created atomically
        const historyLogs = await localDb.history
            .where('reportId')
            .equals(savedReport.id!)
            .toArray();

        expect(historyLogs.length).toBeGreaterThan(0);
        expect(historyLogs[0].eventType).toBe('CREATED');
    });
});
import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { localDb } from '@/db/dexie';
import { createLocalReport } from '@/services/localReportService';

describe('Application Refresh Persistence', () => {
    beforeEach(async () => {
        await localDb.reports.clear();
        await localDb.history.clear();
    });

    it('should retain local reports after simulating an app reload / database re-connection', async () => {
        // 1. Create a local report
        const savedReport = await createLocalReport({
            category: 'WATER_POINT',
            description: 'Water leak detected in Sector 7',
            location: 'Building A Basement',
            priority: 'CRITICAL',
        });

        expect(savedReport.id).toBeDefined();

        // 2. Simulate a full application reload by closing and reopening the Dexie connection
        await localDb.close();
        await localDb.open();

        // 3. Query the database as a freshly loaded app would do on startup
        const reloadedReports = await localDb.reports.toArray();

        expect(reloadedReports.length).toBe(1);
        expect(reloadedReports[0].id).toBe(savedReport.id);
        expect(reloadedReports[0].description).toBe('Water leak detected in Sector 7');
        expect(reloadedReports[0].syncStatus).toBe('PENDING');
    });
});
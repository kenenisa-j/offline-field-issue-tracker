import { describe, it, expect, beforeEach, vi } from 'vitest';
import 'fake-indexeddb/auto';
import { localDb } from '@/db/dexie';
import { createLocalReport } from '@/services/localReportService';
import { pullServerUpdates } from '@/services/syncService';

describe('Server Status Pull Synchronization', () => {
    beforeEach(async () => {
        await localDb.reports.clear();
        await localDb.history.clear();
        vi.restoreAllMocks();
    });

    it('should update local report status when remote coordinator changes status to RESOLVED', async () => {
        // 1. Create local report with DRAFT status
        const local = await createLocalReport({
            category: 'WATER_POINT',
            description: 'Broken water tap',
            location: 'Station 4',
            priority: 'HIGH',
            status: 'DRAFT',
        });

        expect(local.status).toBe('DRAFT');

        // 2. Mock /api/reports returning RESOLVED from server
        global.fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({
                success: true,
                data: [
                    {
                        id: 101,
                        clientId: local.clientId,
                        category: 'WATER_POINT',
                        description: 'Broken water tap',
                        location: 'Station 4',
                        priority: 'HIGH',
                        status: 'RESOLVED',
                        reportedAt: local.reportedAt,
                        createdAt: local.createdAt,
                        updatedAt: new Date().toISOString(),
                        version: 2,
                    },
                ],
            }),
        } as Response);

        // 3. Pull updates from server
        const updatedCount = await pullServerUpdates();
        expect(updatedCount).toBe(1);

        // 4. Verify local report status in Dexie is now RESOLVED
        const updatedReport = await localDb.reports.get(local.id!);
        expect(updatedReport?.status).toBe('RESOLVED');
        expect(updatedReport?.syncStatus).toBe('SYNCED');

        // 5. Verify history timeline contains STATUS_UPDATED event
        const historyLogs = await localDb.history
            .where('reportId')
            .equals(local.id!)
            .sortBy('createdAt');

        const statusUpdateLog = historyLogs.find((h) => h.eventType === 'STATUS_UPDATED');
        expect(statusUpdateLog).toBeDefined();
        expect(statusUpdateLog?.message).toContain('DRAFT to RESOLVED');
    });

    it('should pull new reports created on the remote server into local IndexedDB', async () => {
        const remoteClientId = 'a0000000-0000-0000-0000-000000000001';

        global.fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({
                success: true,
                data: [
                    {
                        id: 202,
                        clientId: remoteClientId,
                        category: 'EQUIPMENT',
                        description: 'Remote server report',
                        location: 'Field Site B',
                        priority: 'MEDIUM',
                        status: 'ASSIGNED',
                        reportedAt: new Date().toISOString(),
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString(),
                        version: 1,
                    },
                ],
            }),
        } as Response);

        const updatedCount = await pullServerUpdates();
        expect(updatedCount).toBe(1);

        const saved = await localDb.reports.where('clientId').equals(remoteClientId).first();
        expect(saved).toBeDefined();
        expect(saved?.status).toBe('ASSIGNED');
        expect(saved?.category).toBe('EQUIPMENT');
    });
});

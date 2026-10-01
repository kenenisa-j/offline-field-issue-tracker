import { localDb, LocalReport } from '@/db/dexie';

/**
 * Retrieves all local reports that need to be synchronized with the remote server.
 * This includes records with 'PENDING' status or retryable 'FAILED' status.
 */
export async function getPendingReports(): Promise<LocalReport[]> {
    try {
        const reports = await localDb.reports
            .where('syncStatus')
            .anyOf(['PENDING', 'FAILED'])
            .toArray();

        return reports;
    } catch (error) {
        console.error('Failed to query pending local reports:', error);
        return [];
    }
}

/**
 * Sends a single local report to the remote backend API.
 * Handles idempotency, success updates, and failure logging.
 */
export async function syncSingleReport(report: LocalReport): Promise<boolean> {
    if (!report.id) return false;

    const now = new Date().toISOString();

    // 1. Log sync attempt in local history
    await localDb.history.add({
        reportId: report.id,
        clientId: report.clientId,
        eventType: 'SYNC_ATTEMPTED',
        message: `Attempting synchronization for client ID ${report.clientId}`,
        createdAt: now,
    });

    try {
        // 2. Send payload to backend API endpoint
        const response = await fetch('/api/reports', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                clientId: report.clientId,
                category: report.category,
                description: report.description,
                location: report.location,
                priority: report.priority,
                status: report.status,
                reportedAt: report.reportedAt,
                createdAt: report.createdAt,
                updatedAt: report.updatedAt,
                syncStatus: report.syncStatus || 'PENDING',
                version: report.version,
            }),
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
            throw new Error(result.error || result.message || 'Failed to synchronize report with server');
        }

        // 3. Mark local record as SYNCED on success
        await localDb.reports.update(report.id, {
            syncStatus: 'SYNCED',
            syncError: null,
            updatedAt: now,
        });

        // 4. Log successful sync event
        await localDb.history.add({
            reportId: report.id,
            clientId: report.clientId,
            eventType: 'SYNCED',
            message: 'Report successfully synchronized to remote database',
            createdAt: now,
        });

        return true;
    } catch (error: any) {
        const errorMessage = error.message || 'Unknown network or server error';

        // 5. Mark local record as FAILED with error message on error
        await localDb.reports.update(report.id, {
            syncStatus: 'FAILED',
            syncError: errorMessage,
            updatedAt: now,
        });

        // 6. Log sync failure event
        await localDb.history.add({
            reportId: report.id,
            clientId: report.clientId,
            eventType: 'SYNC_FAILED',
            message: `Synchronization failed: ${errorMessage}`,
            createdAt: now,
        });

        return false;
    }
}

/**
 * Iterates through and syncs all pending/failed reports.
 */
export async function syncAllPendingReports(): Promise<{ synced: number; failed: number }> {
    const pendingReports = await getPendingReports();
    let synced = 0;
    let failed = 0;

    for (const report of pendingReports) {
        const success = await syncSingleReport(report);
        if (success) {
            synced++;
        } else {
            failed++;
        }
    }

    // Pull latest updates from server to ensure local IndexedDB reflects remote state changes
    try {
        await pullServerUpdates();
    } catch (err) {
        console.error('Post-sync server pull failed:', err);
    }

    return { synced, failed };
}

/**
 * Pulls the latest report status and records from the server and updates
 * any local records in IndexedDB that have a stale status (e.g. coordinator changed it),
 * or inserts reports created on the remote server.
 */
export async function pullServerUpdates(): Promise<number> {
    try {
        const response = await fetch('/api/reports');
        if (!response.ok) {
            console.error('pullServerUpdates: server responded with', response.status);
            return 0;
        }

        const result = await response.json();
        if (!result.success || !Array.isArray(result.data)) {
            console.error('pullServerUpdates: unexpected response shape', result);
            return 0;
        }

        type ServerRow = Record<string, unknown>;
        const serverReports: ServerRow[] = result.data;

        // Load all local reports into memory for matching (indexed by lowercase clientId)
        const allLocalReports = await localDb.reports.toArray();
        const localByClientId = new Map(
            allLocalReports.map((r) => [r.clientId.toLowerCase(), r])
        );

        let updated = 0;

        for (const row of serverReports) {
            // Support both camelCase (Drizzle mapped) and snake_case keys
            const rawClientId = (row.clientId ?? row.client_id) as string | undefined;
            const serverStatus = row.status as string | undefined;

            if (!rawClientId || !serverStatus) continue;

            const normalizedClientId = rawClientId.toLowerCase();
            const localReport = localByClientId.get(normalizedClientId);

            if (!localReport || !localReport.id) {
                // If report exists on server but not in local IndexedDB, insert it
                const now = new Date().toISOString();
                const newId = await localDb.reports.add({
                    clientId: rawClientId,
                    category: (row.category as any) || 'OTHER',
                    description: (row.description as string) || '',
                    location: (row.location as string) || '',
                    priority: (row.priority as any) || 'MEDIUM',
                    status: serverStatus as LocalReport['status'],
                    reportedAt: (row.reportedAt as string) || now,
                    createdAt: (row.createdAt as string) || now,
                    updatedAt: (row.updatedAt as string) || now,
                    syncStatus: 'SYNCED',
                    syncError: null,
                    version: typeof row.version === 'number' ? row.version : 1,
                });

                await localDb.history.add({
                    reportId: newId,
                    clientId: rawClientId,
                    eventType: 'PULLED_FROM_SERVER',
                    message: `Report retrieved from server with status ${serverStatus}`,
                    createdAt: now,
                });

                updated++;
                continue;
            }

            // If report exists locally, check if status or version needs updating
            if (localReport.status !== serverStatus) {
                const prevStatus = localReport.status;
                await localDb.reports.update(localReport.id, {
                    status: serverStatus as LocalReport['status'],
                    syncStatus: 'SYNCED',
                    syncError: null,
                    updatedAt: new Date().toISOString(),
                    version: typeof row.version === 'number' ? row.version : localReport.version,
                });

                await localDb.history.add({
                    reportId: localReport.id,
                    clientId: localReport.clientId,
                    eventType: 'STATUS_UPDATED',
                    message: `Status updated from ${prevStatus} to ${serverStatus} (pulled from server)`,
                    createdAt: new Date().toISOString(),
                });

                updated++;
            }
        }

        return updated;
    } catch (err) {
        console.error('pullServerUpdates failed:', err);
        return 0;
    }
}
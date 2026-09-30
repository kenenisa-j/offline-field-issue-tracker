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

    return { synced, failed };
}
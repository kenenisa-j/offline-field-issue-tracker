'use client';

import { useState } from 'react';
import { useLocalReports } from '@/hooks/useLocalReports';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { syncAllPendingReports, syncSingleReport } from '@/services/syncService';
import { LocalReport } from '@/db/dexie';

export function SyncManager() {
    const { reports } = useLocalReports();
    const isOnline = useNetworkStatus();
    const [isSyncing, setIsSyncing] = useState(false);

    const pendingReports = reports.filter((r) => r.syncStatus === 'PENDING' || r.syncStatus === 'FAILED');
    const failedReports = reports.filter((r) => r.syncStatus === 'FAILED');

    const handleSyncAll = async () => {
        if (!isOnline || isSyncing) return;
        setIsSyncing(true);
        try {
            await syncAllPendingReports();
        } finally {
            setIsSyncing(false);
        }
    };

    const handleRetrySingle = async (report: LocalReport) => {
        if (!isOnline) return;
        await syncSingleReport(report);
    };

    if (pendingReports.length === 0) {
        return (
            <div className="flex items-center gap-2 text-xs text-emerald-600 font-medium bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                All local reports synchronized
            </div>
        );
    }

    return (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping" />
                    <span className="text-sm font-semibold text-amber-900">
                        {pendingReports.length} report(s) waiting to sync
                    </span>
                </div>
                <button
                    onClick={handleSyncAll}
                    disabled={!isOnline || isSyncing}
                    className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-xs font-medium rounded-lg transition-colors shadow-sm"
                >
                    {isSyncing ? 'Syncing...' : 'Sync Now'}
                </button>
            </div>

            {!isOnline && (
                <p className="text-xs text-amber-700 italic">
                    You are currently offline. Changes are saved locally and will sync automatically when connection returns.
                </p>
            )}

            {failedReports.length > 0 && (
                <div className="space-y-2 mt-2 pt-2 border-t border-amber-200">
                    <p className="text-xs font-semibold text-red-700">⚠ Sync failed for {failedReports.length} report(s):</p>
                    {failedReports.map((report) => (
                        <div key={report.id} className="flex items-center justify-between bg-white p-2 rounded-lg border border-red-200 text-xs">
                            <div>
                                <span className="font-medium text-gray-900">{report.category}</span> —{' '}
                                <span className="text-red-600 truncate max-w-[200px] inline-block align-bottom">
                                    {report.syncError || 'Unknown error'}
                                </span>
                            </div>
                            <button
                                onClick={() => handleRetrySingle(report)}
                                disabled={!isOnline}
                                className="px-2 py-1 bg-red-50 hover:bg-red-100 text-red-700 font-semibold rounded border border-red-300 transition-colors"
                            >
                                Retry
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
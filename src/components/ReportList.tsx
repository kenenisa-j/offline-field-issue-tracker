'use client';

import { useState, useEffect } from 'react';
import { useLocalReports } from '@/hooks/useLocalReports';
import { syncSingleReport, pullServerUpdates } from '@/services/syncService';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { LocalReport } from '@/db/dexie';
import { ReportDetailModal } from './ReportDetailModal';

export function ReportList() {
    const { reports, isLoading } = useLocalReports();
    const isOnline = useNetworkStatus();
    const [selectedReport, setSelectedReport] = useState<LocalReport | null>(null);
    const [isRefreshing, setIsRefreshing] = useState(false);

    useEffect(() => {
        if (isOnline) {
            pullServerUpdates().catch((err) => {
                console.error('Initial pull on ReportList mount failed:', err);
            });
        }
    }, [isOnline]);

    const handleRefresh = async () => {
        if (!isOnline || isRefreshing) return;
        setIsRefreshing(true);
        try {
            await pullServerUpdates();
        } finally {
            setIsRefreshing(false);
        }
    };

    if (isLoading) {
        return <div className="text-sm text-gray-500 py-4">Loading reports...</div>;
    }

    if (reports.length === 0) {
        return (
            <div className="bg-white p-8 rounded-xl border border-gray-200 text-center text-gray-500 text-sm">
                No local reports found. Create one above to get started!
            </div>
        );
    }

    const getSyncBadge = (syncStatus: string) => {
        switch (syncStatus) {
            case 'SYNCED':
                return <span className="text-emerald-600 font-medium">Sync: Synced</span>;
            case 'FAILED':
                return <span className="text-red-600 font-medium">Sync: Failed</span>;
            case 'PENDING':
            default:
                return <span className="text-amber-600 font-medium">Sync: Pending</span>;
        }
    };

    const getPriorityBadge = (priority: string) => {
        const colors: Record<string, string> = {
            LOW: 'bg-gray-100 text-gray-700',
            MEDIUM: 'bg-blue-100 text-blue-700',
            HIGH: 'bg-orange-100 text-orange-700',
            CRITICAL: 'bg-red-100 text-red-700',
        };
        return <span className={`px-2 py-0.5 rounded text-xs font-semibold ${colors[priority] || 'bg-gray-100 text-gray-700'}`}>{priority}</span>;
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-950">Local Reports</h2>
                <button
                    onClick={handleRefresh}
                    disabled={!isOnline || isRefreshing}
                    className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 text-gray-700 text-xs font-medium rounded-lg transition-colors"
                >
                    {isRefreshing ? 'Refreshing...' : '↻ Refresh from Server'}
                </button>
            </div>
            <div className="grid grid-cols-1 gap-3">
                {reports.map((report) => (
                    <div key={report.id || report.clientId} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div className="space-y-1">
                            <div className="flex items-center gap-2">
                                <span className="font-semibold text-gray-900">{report.category}</span>
                                {getPriorityBadge(report.priority)}
                                <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded font-medium">{report.status}</span>
                            </div>
                            <p className="text-sm text-gray-600 line-clamp-2">{report.description}</p>
                            <p className="text-xs text-gray-400">Location: {report.location} • {new Date(report.createdAt).toLocaleString()}</p>
                        </div>

                        <div className="flex items-center gap-3 self-end sm:self-center">
                            <button
                                onClick={() => setSelectedReport(report)}
                                className="px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-medium rounded-lg transition-colors"
                            >
                                View History
                            </button>
                            <div className="text-xs bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200">
                                {getSyncBadge(report.syncStatus)}
                            </div>
                            {report.syncStatus === 'FAILED' && (
                                <button
                                    onClick={() => isOnline && syncSingleReport(report)}
                                    disabled={!isOnline}
                                    className="px-2.5 py-1.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-xs font-medium rounded-lg shadow-sm"
                                >
                                    Retry
                                </button>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {selectedReport && (
                <ReportDetailModal
                    report={selectedReport}
                    onCloseAction={() => setSelectedReport(null)}
                />
            )}
        </div>
    );
}
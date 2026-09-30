'use client';

import { useLocalReports } from '@/hooks/useLocalReports';

export function ReportDashboard() {
    const { reports, isLoading } = useLocalReports();

    if (isLoading) {
        return <div className="p-4 text-sm text-gray-500">Loading metrics...</div>;
    }

    const totalReports = reports.length;
    const pendingSync = reports.filter((r) => r.syncStatus === 'PENDING').length;
    const synced = reports.filter((r) => r.syncStatus === 'SYNCED').length;
    const failed = reports.filter((r) => r.syncStatus === 'FAILED').length;

    return (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Total Reports</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{totalReports}</p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-amber-200 shadow-sm bg-amber-50/30">
                <p className="text-xs font-medium text-amber-600 uppercase tracking-wider">Pending Sync</p>
                <p className="text-2xl font-bold text-amber-600 mt-1">{pendingSync}</p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-emerald-200 shadow-sm bg-emerald-50/30">
                <p className="text-xs font-medium text-emerald-600 uppercase tracking-wider">Synced</p>
                <p className="text-2xl font-bold text-emerald-600 mt-1">{synced}</p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-red-200 shadow-sm bg-red-50/30">
                <p className="text-xs font-medium text-red-600 uppercase tracking-wider">Failed</p>
                <p className="text-2xl font-bold text-red-600 mt-1">{failed}</p>
            </div>
        </div>
    );
}
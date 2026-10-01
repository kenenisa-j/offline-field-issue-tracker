'use client';

import { useEffect, useState, useCallback } from 'react';
import { pullServerUpdates } from '@/services/syncService';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { localDb, LocalReport } from '@/db/dexie';
import { WifiOff, AlertTriangle, RefreshCw, ArrowRight, CloudOff, Info } from 'lucide-react';

export interface ServerReport {
    id: number;
    clientId: string;
    category: string;
    description: string;
    location: string;
    priority: string;
    status: string;
    reportedAt: string;
    createdAt: string;
    updatedAt: string;
}

interface CoordinatorReportListProps {
    onSwitchToFieldWorkerAction?: () => void;
}

export function CoordinatorReportList({ onSwitchToFieldWorkerAction }: CoordinatorReportListProps) {
    const isOnline = useNetworkStatus();
    const [reports, setReports] = useState<ServerReport[]>([]);
    const [cachedReports, setCachedReports] = useState<LocalReport[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [actionError, setActionError] = useState<{ id: number; message: string } | null>(null);
    const [processingId, setProcessingId] = useState<number | null>(null);

    const loadLocalCache = useCallback(async () => {
        try {
            const local = await localDb.reports.toArray();
            setCachedReports(local);
        } catch (e) {
            console.error('Failed to load cached local reports:', e);
        }
    }, []);

    const fetchServerReports = useCallback(async (isInitial = false) => {
        if (!navigator.onLine) {
            await loadLocalCache();
            setIsLoading(false);
            setIsRefreshing(false);
            return;
        }

        if (isInitial) {
            setIsLoading(true);
        } else {
            setIsRefreshing(true);
        }
        setError(null);
        try {
            const response = await fetch('/api/reports');
            const result = await response.json();
            if (!response.ok || !result.success) {
                throw new Error(result.error || 'Failed to fetch server reports');
            }
            setReports(result.data || []);
        } catch (err: any) {
            console.error('fetchServerReports error:', err);
            // Provide a clean user-facing error message only on initial failure if no data
            if (isInitial) {
                setError('Could not connect to central reporting server. Please check your network connection.');
            }
            await loadLocalCache();
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    }, [loadLocalCache]);

    useEffect(() => {
        if (isOnline) {
            fetchServerReports(true);
        } else {
            loadLocalCache();
            setIsLoading(false);
        }
    }, [isOnline, fetchServerReports, loadLocalCache]);

    const handleStatusChange = async (reportId: number, newStatus: string) => {
        if (!isOnline) {
            setActionError({ id: reportId, message: 'Cannot modify report status while offline' });
            return;
        }

        setProcessingId(reportId);
        setActionError(null);
        try {
            const response = await fetch(`/api/reports/${reportId}/status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nextStatus: newStatus, changedBy: 'COORDINATOR' }),
            });
            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(result.error || 'Invalid state transition');
            }

            // Optimistically update the UI immediately without flickering or unmounting the list
            setReports((prev) =>
                prev.map((r) => (r.id === reportId ? { ...r, status: newStatus as any } : r))
            );

            // Silently sync server list in background
            await fetchServerReports(false);

            // Also immediately sync changes to local IndexedDB
            await pullServerUpdates();
        } catch (err: any) {
            setActionError({ id: reportId, message: err.message || 'Action failed' });
            await fetchServerReports(false);
        } finally {
            setProcessingId(null);
        }
    };

    if (isLoading && reports.length === 0) {
        return (
            <div className="flex items-center justify-center gap-3 py-12 text-sm text-gray-500">
                <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
                <span>Loading coordinator queue from server...</span>
            </div>
        );
    }

    // OFFLINE MODE: When completely offline
    if (!isOnline) {
        return (
            <div className="space-y-4">
                {/* Offline Header Alert Banner */}
                <div className="bg-amber-50/90 border border-amber-200 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-700 shrink-0">
                            <WifiOff className="w-5 h-5" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="text-sm font-semibold text-amber-950">Coordinator Console is Offline</h3>
                                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-amber-200 text-amber-900">
                                    Read-Only
                                </span>
                            </div>
                            <p className="text-xs text-amber-800 mt-0.5">
                                Reviewing and transitioning report statuses requires an active network connection to the central server.
                            </p>
                        </div>
                    </div>
                    {onSwitchToFieldWorkerAction && (
                        <button
                            onClick={onSwitchToFieldWorkerAction}
                            className="shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
                        >
                            <span>Work in Field Mode</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                    )}
                </div>

                {/* If cached local reports are available, show them read-only */}
                {cachedReports.length > 0 ? (
                    <div className="space-y-3">
                        <div className="flex items-center justify-between px-1">
                            <p className="text-xs font-medium text-gray-500">
                                Displaying {cachedReports.length} locally cached report(s)
                            </p>
                            <span className="text-[11px] text-amber-700 font-medium flex items-center gap-1">
                                <Info className="w-3.5 h-3.5" /> Status actions paused while offline
                            </span>
                        </div>
                        <div className="grid grid-cols-1 gap-3 opacity-90">
                            {cachedReports.map((report) => (
                                <div key={report.clientId} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm space-y-3">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <span className="font-semibold text-gray-900">{report.category}</span>
                                            <span className="px-2 py-0.5 rounded text-xs font-semibold bg-blue-100 text-blue-700">{report.priority}</span>
                                            <span className="px-2 py-0.5 rounded text-xs font-semibold bg-gray-100 text-gray-700">{report.status}</span>
                                        </div>
                                        <span className="text-xs text-gray-400 font-mono">ID: #{report.id ?? '—'}</span>
                                    </div>
                                    <p className="text-sm text-gray-700">{report.description}</p>
                                    <p className="text-xs text-gray-500">Location: {report.location} • Reported: {new Date(report.reportedAt).toLocaleString()}</p>
                                    <div className="flex items-center gap-2 pt-2 border-t border-gray-100 text-xs text-gray-400">
                                        <span className="font-semibold uppercase text-gray-400">Actions:</span>
                                        <span className="italic">Disabled offline • Live server connection required</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm text-center space-y-4 max-w-lg mx-auto">
                        <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto border border-amber-200 shadow-inner">
                            <CloudOff className="w-7 h-7" />
                        </div>
                        <div className="space-y-1.5">
                            <h3 className="text-base font-bold text-gray-950">No Cached Reports Available</h3>
                            <p className="text-xs text-gray-600 leading-relaxed">
                                Connect to the internet to load the central review queue, or switch to Field Worker mode to draft and capture issues offline.
                            </p>
                        </div>
                        {onSwitchToFieldWorkerAction && (
                            <div className="pt-2">
                                <button
                                    onClick={onSwitchToFieldWorkerAction}
                                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all"
                                >
                                    Switch to Field Worker Mode
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        );
    }

    // SERVER ERROR STATE: Online, but server connection failed
    if (error) {
        return (
            <div className="bg-white border border-red-200 rounded-2xl p-6 shadow-sm text-center space-y-4 max-w-lg mx-auto">
                <div className="w-12 h-12 rounded-xl bg-red-100 text-red-600 flex items-center justify-center mx-auto">
                    <AlertTriangle className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                    <h3 className="text-sm font-bold text-gray-950">Unable to Connect to Coordinator Server</h3>
                    <p className="text-xs text-gray-600 leading-relaxed">
                        {error}
                    </p>
                </div>
                <div className="pt-2 flex flex-wrap items-center justify-center gap-2">
                    <button
                        onClick={() => fetchServerReports()}
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors"
                    >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Retry Connection</span>
                    </button>
                    {onSwitchToFieldWorkerAction && (
                        <button
                            onClick={onSwitchToFieldWorkerAction}
                            className="px-3.5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-medium transition-colors"
                        >
                            Work in Field Mode
                        </button>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <h2 className="text-lg font-semibold text-gray-950">Coordinator Review Queue ({reports.length})</h2>
                    <span className="text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        Live Database
                    </span>
                </div>
                <button
                    onClick={() => fetchServerReports(false)}
                    disabled={isRefreshing}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-medium rounded-lg transition-colors disabled:opacity-60"
                >
                    <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin text-blue-600' : ''}`} />
                    <span>{isRefreshing ? 'Refreshing...' : 'Refresh Queue'}</span>
                </button>
            </div>

            {reports.length === 0 ? (
                <div className="bg-white p-8 rounded-xl border border-gray-200 text-center text-gray-500 text-sm">
                    No reports currently waiting in the coordinator queue.
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-3">
                    {reports.map((report) => (
                        <div key={report.id} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm space-y-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <span className="font-semibold text-gray-900">{report.category}</span>
                                    <span className="px-2 py-0.5 rounded text-xs font-semibold bg-blue-100 text-blue-700">{report.priority}</span>
                                    <span className="px-2 py-0.5 rounded text-xs font-semibold bg-amber-100 text-amber-800">{report.status}</span>
                                </div>
                                <span className="text-xs text-gray-400 font-mono">ID: #{report.id}</span>
                            </div>

                            <p className="text-sm text-gray-700">{report.description}</p>
                            <p className="text-xs text-gray-500">Location: {report.location} • Reported: {new Date(report.reportedAt).toLocaleString()}</p>

                            {actionError && actionError.id === report.id && (
                                <div className="p-2.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-center justify-between">
                                    <span>⚠ State Error: {actionError.message}</span>
                                    <button onClick={() => setActionError(null)} className="font-bold">✕</button>
                                </div>
                            )}

                            {/* State Machine Transition Actions */}
                            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-gray-100">
                                <span className="text-xs font-semibold text-gray-500 uppercase">Actions:</span>

                                {report.status === 'DRAFT' && (
                                    <button
                                        onClick={() => handleStatusChange(report.id, 'SUBMITTED')}
                                        disabled={processingId === report.id}
                                        className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-xs font-medium disabled:opacity-50 transition-colors shadow-xs"
                                    >
                                        {processingId === report.id && <RefreshCw className="w-3 h-3 animate-spin" />}
                                        <span>{processingId === report.id ? 'Submitting...' : 'Submit for Review'}</span>
                                    </button>
                                )}

                                {report.status === 'SUBMITTED' && (
                                    <>
                                        <button
                                            onClick={() => handleStatusChange(report.id, 'ASSIGNED')}
                                            disabled={processingId === report.id}
                                            className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-medium disabled:opacity-50 transition-colors shadow-xs"
                                        >
                                            {processingId === report.id && <RefreshCw className="w-3 h-3 animate-spin" />}
                                            <span>{processingId === report.id ? 'Assigning...' : 'Assign'}</span>
                                        </button>
                                        <button
                                            onClick={() => handleStatusChange(report.id, 'REJECTED')}
                                            disabled={processingId === report.id}
                                            className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-medium disabled:opacity-50 transition-colors shadow-xs"
                                        >
                                            {processingId === report.id && <RefreshCw className="w-3 h-3 animate-spin" />}
                                            <span>{processingId === report.id ? 'Rejecting...' : 'Reject'}</span>
                                        </button>
                                    </>
                                )}

                                {report.status === 'ASSIGNED' && (
                                    <button
                                        onClick={() => handleStatusChange(report.id, 'IN_PROGRESS')}
                                        disabled={processingId === report.id}
                                        className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded text-xs font-medium disabled:opacity-50 transition-colors shadow-xs"
                                    >
                                        {processingId === report.id && <RefreshCw className="w-3 h-3 animate-spin" />}
                                        <span>{processingId === report.id ? 'Starting...' : 'Start Work'}</span>
                                    </button>
                                )}

                                {report.status === 'IN_PROGRESS' && (
                                    <button
                                        onClick={() => handleStatusChange(report.id, 'RESOLVED')}
                                        disabled={processingId === report.id}
                                        className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-medium disabled:opacity-50 transition-colors shadow-xs"
                                    >
                                        {processingId === report.id && <RefreshCw className="w-3 h-3 animate-spin" />}
                                        <span>{processingId === report.id ? 'Resolving...' : 'Resolve'}</span>
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
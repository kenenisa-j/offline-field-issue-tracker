'use client';

import { useEffect, useState } from 'react';
import { pullServerUpdates } from '@/services/syncService';

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

export function CoordinatorReportList() {
    const [reports, setReports] = useState<ServerReport[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [actionError, setActionError] = useState<{ id: number; message: string } | null>(null);
    const [processingId, setProcessingId] = useState<number | null>(null);

    const fetchServerReports = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await fetch('/api/reports');
            const result = await response.json();
            if (!response.ok || !result.success) {
                throw new Error(result.error || 'Failed to fetch server reports');
            }
            setReports(result.data || []);
        } catch (err: any) {
            setError(err.message || 'Error connecting to server');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchServerReports();
    }, []);

    const handleStatusChange = async (reportId: number, newStatus: string) => {
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

            // Refresh server list in coordinator UI
            await fetchServerReports();

            // Also immediately sync changes to local IndexedDB
            await pullServerUpdates();
        } catch (err: any) {
            setActionError({ id: reportId, message: err.message || 'Action failed' });
        } finally {
            setProcessingId(null);
        }
    };

    if (isLoading) {
        return <div className="text-sm text-gray-500 py-6">Loading coordinator queue from server...</div>;
    }

    if (error) {
        return (
            <div className="bg-red-50 border border-red-200 p-4 rounded-xl text-red-700 text-sm space-y-2">
                <p className="font-semibold">⚠ Could not load coordinator view</p>
                <p className="text-xs">{error}</p>
                <button onClick={fetchServerReports} className="px-3 py-1 bg-red-600 text-white rounded text-xs font-medium">
                    Retry
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-950">Coordinator Review Queue ({reports.length})</h2>
                <button
                    onClick={fetchServerReports}
                    className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-medium rounded-lg transition-colors"
                >
                    Refresh Queue
                </button>
            </div>

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
                                    className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-xs font-medium disabled:opacity-50"
                                >
                                    Submit for Review
                                </button>
                            )}

                            {report.status === 'SUBMITTED' && (
                                <>
                                    <button
                                        onClick={() => handleStatusChange(report.id, 'ASSIGNED')}
                                        disabled={processingId === report.id}
                                        className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-medium disabled:opacity-50"
                                    >
                                        Assign
                                    </button>
                                    <button
                                        onClick={() => handleStatusChange(report.id, 'REJECTED')}
                                        disabled={processingId === report.id}
                                        className="px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-medium disabled:opacity-50"
                                    >
                                        Reject
                                    </button>
                                </>
                            )}

                            {report.status === 'ASSIGNED' && (
                                <button
                                    onClick={() => handleStatusChange(report.id, 'IN_PROGRESS')}
                                    disabled={processingId === report.id}
                                    className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded text-xs font-medium disabled:opacity-50"
                                >
                                    Start Work
                                </button>
                            )}

                            {report.status === 'IN_PROGRESS' && (
                                <button
                                    onClick={() => handleStatusChange(report.id, 'RESOLVED')}
                                    disabled={processingId === report.id}
                                    className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-medium disabled:opacity-50"
                                >
                                    Resolve
                                </button>
                            )}

                            {/* Test Invalid Transition (e.g., Resolved -> Assigned) */}
                            <button
                                onClick={() => handleStatusChange(report.id, 'ASSIGNED')}
                                disabled={processingId === report.id}
                                className="px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded text-[10px] font-medium"
                                title="Tests invalid backend state transition"
                            >
                                Test Invalid (→ Assigned)
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
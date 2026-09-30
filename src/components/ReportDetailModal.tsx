'use client';

import { useEffect, useState } from 'react';
import { LocalReport, localDb, LocalHistoryEvent } from '@/db/dexie';
import { SyncBadge } from './SyncBadge';

export function ReportDetailModal({ report, onCloseAction }: { report: LocalReport; onCloseAction: () => void }) {
    const [history, setHistory] = useState<LocalHistoryEvent[]>([]);
    const [isLoadingHistory, setIsLoadingHistory] = useState(true);

    useEffect(() => {
        async function loadHistory() {
            if (!report.id) return;
            try {
                const logs = await localDb.history
                    .where('reportId')
                    .equals(report.id)
                    .sortBy('createdAt'); // Chronological order for timelines
                setHistory(logs);
            } catch (error) {
                console.error('Failed to load report history:', error);
            } finally {
                setIsLoadingHistory(false);
            }
        }

        loadHistory();
    }, [report.id]);

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-xl border border-gray-200 p-6 space-y-6">
                <div className="flex items-center justify-between border-b pb-4">
                    <div>
                        <span className="text-xs font-semibold uppercase tracking-wider text-blue-600">{report.category}</span>
                        <h2 className="text-xl font-bold text-gray-950 mt-0.5">Report Details</h2>
                    </div>
                    <button
                        onClick={onCloseAction}
                        className="text-gray-400 hover:text-gray-600 font-semibold text-lg p-1"
                    >
                        ✕
                    </button>
                </div>

                <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-xl border border-gray-100 text-sm">
                    <div>
                        <span className="block text-xs font-medium text-gray-500 uppercase">Priority</span>
                        <span className="font-semibold text-gray-900">{report.priority}</span>
                    </div>
                    <div>
                        <span className="block text-xs font-medium text-gray-500 uppercase">Status</span>
                        <span className="font-semibold text-gray-900">{report.status}</span>
                    </div>
                    <div>
                        <span className="block text-xs font-medium text-gray-500 uppercase">Sync Status</span>
                        <div className="mt-1"><SyncBadge syncStatus={report.syncStatus} /></div>
                    </div>
                    <div>
                        <span className="block text-xs font-medium text-gray-500 uppercase">Date / Time</span>
                        <span className="font-medium text-gray-900 text-xs">{new Date(report.createdAt).toLocaleString()}</span>
                    </div>
                </div>

                <div className="space-y-1">
                    <span className="block text-xs font-medium text-gray-500 uppercase">Location</span>
                    <p className="text-sm font-medium text-gray-900 bg-white p-3 rounded-lg border border-gray-200">{report.location}</p>
                </div>

                <div className="space-y-1">
                    <span className="block text-xs font-medium text-gray-500 uppercase">Description</span>
                    <p className="text-sm text-gray-700 bg-white p-3 rounded-lg border border-gray-200 whitespace-pre-wrap">{report.description}</p>
                </div>

                {report.syncError && (
                    <div className="space-y-1">
                        <span className="block text-xs font-medium text-red-600 uppercase">Sync Error</span>
                        <p className="text-xs text-red-700 bg-red-50 p-3 rounded-lg border border-red-200">{report.syncError}</p>
                    </div>
                )}

                {/* Audit Timeline View */}
                <div className="space-y-3 border-t pt-4">
                    <h3 className="text-sm font-semibold text-gray-900">Explainability Audit Timeline</h3>
                    {isLoadingHistory ? (
                        <p className="text-xs text-gray-400">Loading timeline...</p>
                    ) : history.length === 0 ? (
                        <p className="text-xs text-gray-400">No history events recorded yet.</p>
                    ) : (
                        <div className="space-y-4 relative before:absolute before:inset-0 before:left-3 before:w-0.5 before:bg-gray-200 pl-2">
                            {history.map((log) => {
                                const date = new Date(log.createdAt);
                                const formattedDate = `${date.toLocaleString('default', { month: 'short' })} ${date.getDate()}, ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

                                return (
                                    <div key={log.id} className="relative flex items-start gap-4 pl-6">
                                        <span className="absolute left-1.5 -translate-x-1/2 w-2.5 h-2.5 rounded-full bg-blue-600 ring-4 ring-white" />
                                        <div className="space-y-0.5">
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] font-semibold text-blue-600 uppercase tracking-wider">{log.eventType}</span>
                                                <span className="text-[10px] text-gray-400">• {formattedDate}</span>
                                            </div>
                                            <p className="text-xs text-gray-700">{log.message}</p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
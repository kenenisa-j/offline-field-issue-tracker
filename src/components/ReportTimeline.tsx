'use client';

import { useEffect, useState } from 'react';
import { localDb, LocalHistoryEvent } from '@/db/dexie';

export function ReportTimeline({ reportId }: { reportId: number }) {
    const [history, setHistory] = useState<LocalHistoryEvent[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        async function loadHistory() {
            try {
                const logs = await localDb.history
                    .where('reportId')
                    .equals(reportId)
                    .sortBy('createdAt');
                setHistory(logs);
            } catch (err) {
                console.error('Failed to load audit timeline:', err);
            } finally {
                setIsLoading(false);
            }
        }

        loadHistory();
    }, [reportId]);

    if (isLoading) {
        return <div className="text-xs text-gray-400 py-2">Loading audit timeline...</div>;
    }

    if (history.length === 0) {
        return <div className="text-xs text-gray-400 py-2">No history events recorded.</div>;
    }

    return (
        <div className="space-y-4 relative before:absolute before:inset-0 before:left-3 before:w-0.5 before:bg-gray-200">
            {history.map((entry) => {
                const date = new Date(entry.createdAt);
                const formattedDate = `${date.toLocaleString('default', { month: 'short' })} ${date.getDate()} ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

                return (
                    <div key={entry.id} className="relative flex items-start gap-4 pl-8">
                        {/* Timeline dot */}
                        <span className="absolute left-2 -translate-x-1/2 w-2.5 h-2.5 rounded-full bg-blue-600 ring-4 ring-white" />

                        <div className="space-y-0.5">
                            <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">{formattedDate}</span>
                            <p className="text-xs font-medium text-gray-900">{entry.message}</p>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
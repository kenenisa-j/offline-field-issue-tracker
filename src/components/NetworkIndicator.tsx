'use client';

import { useNetworkStatus } from '@/hooks/useNetworkStatus';

export function NetworkIndicator() {
    const isOnline = useNetworkStatus();

    if (isOnline) {
        return (
            <div className="flex items-center gap-2 text-xs font-medium text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                Online
            </div>
        );
    }

    return (
        <div className="flex items-center gap-2 text-xs font-medium text-amber-800 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-200 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
            <span>No connection — reports will be saved locally</span>
        </div>
    );
}
'use client';

import { useEffect } from 'react';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { syncAllPendingReports } from '@/services/syncService';

export function AutoSyncProvider({ children }: { children: React.ReactNode }) {
    const isOnline = useNetworkStatus();

    useEffect(() => {
        if (isOnline) {
            // Automatically trigger sync when network connection is restored
            syncAllPendingReports().catch((err) => {
                console.error('Auto-sync failed upon reconnection:', err);
            });
        }
    }, [isOnline]);

    return <>{children}</>;
}
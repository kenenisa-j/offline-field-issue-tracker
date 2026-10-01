'use client';

import { useEffect } from 'react';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { syncAllPendingReports, pullServerUpdates } from '@/services/syncService';

export function AutoSyncProvider({ children }: { children: React.ReactNode }) {
    const isOnline = useNetworkStatus();

    useEffect(() => {
        if (!isOnline) return;

        // Immediately sync pending local changes and pull latest server status
        syncAllPendingReports().catch((err) => {
            console.error('Auto-sync failed upon reconnection:', err);
        });

        // Periodic background poll every 8 seconds when online
        const intervalId = setInterval(() => {
            if (typeof navigator !== 'undefined' && navigator.onLine) {
                pullServerUpdates().catch((err) => {
                    console.error('Periodic server pull failed:', err);
                });
            }
        }, 8000);

        // Pull immediately when tab regains focus or visibility
        const handleVisibilityOrFocus = () => {
            if (document.visibilityState === 'visible' && navigator.onLine) {
                pullServerUpdates().catch((err) => {
                    console.error('Focus server pull failed:', err);
                });
            }
        };

        window.addEventListener('focus', handleVisibilityOrFocus);
        document.addEventListener('visibilitychange', handleVisibilityOrFocus);

        return () => {
            clearInterval(intervalId);
            window.removeEventListener('focus', handleVisibilityOrFocus);
            document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
        };
    }, [isOnline]);

    return <>{children}</>;
}
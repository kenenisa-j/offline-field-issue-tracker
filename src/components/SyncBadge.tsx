'vow client'; // Or 'use client'

export function SyncBadge({ syncStatus }: { syncStatus: 'PENDING' | 'SYNCED' | 'FAILED' }) {
    switch (syncStatus) {
        case 'SYNCED':
            return (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    ✓ Synced
                </span>
            );
        case 'FAILED':
            return (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                    ⚠ Failed
                </span>
            );
        case 'PENDING':
        default:
            return (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
                    Pending
                </span>
            );
    }
}
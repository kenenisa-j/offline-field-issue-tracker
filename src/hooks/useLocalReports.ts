import { useLiveQuery } from 'dexie-react-hooks';
import { localDb, LocalReport } from '@/db/dexie';

export function useLocalReports() {
    const reports = useLiveQuery(() => localDb.reports.toArray());
    return {
        reports: reports || [],
        isLoading: reports === undefined,
    };
}
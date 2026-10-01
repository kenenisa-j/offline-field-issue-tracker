'use client';

import { useState } from 'react';
import { AutoSyncProvider } from '@/components/AutoSyncProvider';
import { NetworkIndicator } from '@/components/NetworkIndicator';
import { RoleSwitcher, UserRole } from '@/components/RoleSwitcher';
import { ReportDashboard } from '@/components/ReportDashboard';
import { CreateReportForm } from '@/components/CreateReportForm';
import { SyncManager } from '@/components/SyncManager';
import { ReportList } from '@/components/ReportList';
import { CoordinatorReportList } from '@/components/CoordinatorReportList';
import { pullServerUpdates } from '@/services/syncService';

export default function Home() {
    const [role, setRole] = useState<UserRole>('FIELD_WORKER');

    const handleRoleChange = (newRole: UserRole) => {
        setRole(newRole);
        if (newRole === 'FIELD_WORKER') {
            pullServerUpdates().catch((err) => {
                console.error('Role change pull failed:', err);
            });
        }
    };

    return (
        <AutoSyncProvider>
            <div className="min-h-screen bg-gray-50 text-gray-900 pb-16">
                {/* Header Navbar */}
                <header className="sticky top-0 z-30 bg-white border-b border-gray-200 shadow-xs">
                    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold text-lg shadow-sm">
                                FI
                            </div>
                            <div>
                                <h1 className="text-xl font-bold tracking-tight text-gray-950">Field Issue Tracker</h1>
                                <p className="text-xs text-gray-500 font-medium">Offline-First Operational Console</p>
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
                            <NetworkIndicator />
                            <RoleSwitcher currentRole={role} onRoleChange={handleRoleChange} />
                        </div>
                    </div>
                </header>

                {/* Main Content Area */}
                <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-6 space-y-6">
                    {/* Top Dashboard Metrics */}
                    <ReportDashboard />

                    {role === 'FIELD_WORKER' ? (
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                            {/* Left Column: Create Report Form & Sync Manager */}
                            <div className="lg:col-span-5 space-y-6">
                                <SyncManager />
                                <CreateReportForm />
                            </div>

                            {/* Right Column: Local Reports List with Audit History */}
                            <div className="lg:col-span-7">
                                <ReportList />
                            </div>
                        </div>
                    ) : (
                        <div className="max-w-4xl mx-auto">
                            <CoordinatorReportList
                                onSwitchToFieldWorkerAction={() => handleRoleChange('FIELD_WORKER')}
                            />
                        </div>
                    )}
                </main>
            </div>
        </AutoSyncProvider>
    );
}

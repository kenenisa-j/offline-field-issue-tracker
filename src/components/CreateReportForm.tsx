'use client';

import { useState } from 'react';
import { createLocalReport } from '@/services/localReportService';
import { syncSingleReport } from '@/services/syncService';
import { ReportCategory, ReportPriority } from '@/types/report';

export function CreateReportForm({ onSuccessAction }: { onSuccessAction?: () => void }) {
    const [category, setCategory] = useState<ReportCategory>('OTHER');
    const [description, setDescription] = useState('');
    const [location, setLocation] = useState('');
    const [priority, setPriority] = useState<ReportPriority>('MEDIUM');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!description.trim() || !location.trim()) return;

        setIsSubmitting(true);
        try {
            const savedReport = await createLocalReport({
                category,
                description,
                location,
                priority,
                status: 'SUBMITTED',
            });

            // If online, immediately sync to server right away
            if (typeof navigator !== 'undefined' && navigator.onLine) {
                syncSingleReport(savedReport).catch((err) => {
                    console.error('Immediate sync failed:', err);
                });
            }

            // Reset form
            setDescription('');
            setLocation('');
            setCategory('OTHER');
            setPriority('MEDIUM');

            if (onSuccessAction) onSuccessAction();
        } catch (error) {
            console.error('Failed to create local report:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-4">
            <h2 className="text-lg font-semibold text-gray-950">New Field Issue Report</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <label className="block text-xs font-medium text-gray-700 uppercase mb-1">Category</label>
                    <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value as ReportCategory)}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="WATER_POINT">Water Point</option>
                        <option value="EQUIPMENT">Equipment</option>
                        <option value="SERVICE_INTERRUPTION">Service Interruption</option>
                        <option value="SAFETY">Safety</option>
                        <option value="MAINTENANCE">Maintenance</option>
                        <option value="OTHER">Other</option>
                    </select>
                </div>

                <div>
                    <label className="block text-xs font-medium text-gray-700 uppercase mb-1">Priority</label>
                    <select
                        value={priority}
                        onChange={(e) => setPriority(e.target.value as ReportPriority)}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="LOW">Low</option>
                        <option value="MEDIUM">Medium</option>
                        <option value="HIGH">High</option>
                        <option value="CRITICAL">Critical</option>
                    </select>
                </div>
            </div>

            <div>
                <label className="block text-xs font-medium text-gray-700 uppercase mb-1">Location</label>
                <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="e.g., Main Street, Pole #12"
                    required
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
            </div>

            <div>
                <label className="block text-xs font-medium text-gray-700 uppercase mb-1">Description</label>
                <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe the issue in detail..."
                    rows={3}
                    required
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
            </div>

            <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium py-2 px-4 rounded-lg text-sm transition-colors shadow-sm"
            >
                {isSubmitting ? 'Saving Locally...' : 'Create Report (Offline-First)'}
            </button>
        </form>
    );
}
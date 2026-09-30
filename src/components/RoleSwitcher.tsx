'use client';

export type UserRole = 'FIELD_WORKER' | 'COORDINATOR';

export function RoleSwitcher({ currentRole, onRoleChange }: { currentRole: UserRole; onRoleChange: (role: UserRole) => void }) {
    return (
        <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-xl border border-gray-200 shadow-sm">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Active Role:</span>
            <select
                value={currentRole}
                onChange={(e) => onRoleChange(e.target.value as UserRole)}
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-900 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
                <option value="FIELD_WORKER">Field Worker (Offline / Creator)</option>
                <option value="COORDINATOR">Coordinator (Review / Status Manager)</option>
            </select>
        </div>
    );
}
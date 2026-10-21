'use client';

import { useState } from 'react';
import { useHearthAway } from '@/lib/context';
import type { UserRole } from '@/lib/types';

const roles: UserRole[] = ['management', 'portfolio_owner', 'sales', 'finance', 'partner'];

export default function ManagementPage() {
  const { currentUser, availableUsers, updateUserRole, deleteUser } = useHearthAway();
  const [busyUid, setBusyUid] = useState('');
  const isManagement = currentUser.role === 'management' || currentUser.role === 'admin';

  if (!isManagement) return <main className="p-8">You do not have access to user management.</main>;

  return (
    <main className="mx-auto max-w-6xl p-6 lg:p-10">
      <div className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">Management</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-900">User administration</h1>
        <p className="mt-2 text-sm text-slate-600">Change access levels or remove Firebase profiles. Invalid sign-ins are no longer added here.</p>
      </div>
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="grid grid-cols-[1.4fr_1fr_1fr_auto] gap-4 border-b border-slate-200 bg-slate-50 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
          <span>User</span><span>Role</span><span>Status</span><span>Actions</span>
        </div>
        {availableUsers.map((user) => (
          <div key={user.uid} className="grid grid-cols-[1.4fr_1fr_1fr_auto] items-center gap-4 border-b border-slate-100 px-5 py-4 last:border-0">
            <div><p className="font-medium text-slate-900">{user.displayName || user.email}</p><p className="text-xs text-slate-500">{user.email}</p></div>
            <select aria-label={`Role for ${user.email}`} value={user.role} disabled={user.uid === currentUser.uid || busyUid === user.uid} onChange={async (event) => { setBusyUid(user.uid); try { await updateUserRole(user.uid, event.target.value as UserRole); } finally { setBusyUid(''); } }} className="rounded-lg border border-slate-300 px-2 py-2 text-sm">
              {roles.map((role) => <option key={role} value={role}>{role.replace('_', ' ')}</option>)}
            </select>
            <span className="text-sm capitalize text-slate-600">{user.status || (user.isApproved === false ? 'pending' : 'approved')}</span>
            <button type="button" disabled={user.uid === currentUser.uid || busyUid === user.uid} onClick={async () => { if (!window.confirm(`Delete ${user.email}?`)) return; setBusyUid(user.uid); try { await deleteUser(user.uid); } finally { setBusyUid(''); } }} className="rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-700 disabled:cursor-not-allowed disabled:opacity-40">Delete</button>
          </div>
        ))}
        {availableUsers.length === 0 && <p className="px-5 py-10 text-center text-sm text-slate-500">No Firebase users found.</p>}
      </div>
    </main>
  );
}

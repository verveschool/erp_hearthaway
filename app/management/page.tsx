'use client';

import { useState } from 'react';
import { useHearthAway } from '@/lib/context';
import type { UserRole } from '@/lib/types';

const roles: UserRole[] = ['management', 'portfolio_owner', 'sales', 'finance', 'partner'];

export default function ManagementPage() {
  const { currentUser, availableUsers, updateUserRole, deleteUser } = useHearthAway();
  const [busyUid, setBusyUid] = useState('');
  const isManagement = currentUser.role === 'management' || currentUser.role === 'admin';

  if (!isManagement) return <section className="p-8">You do not have access to user management.</section>;

  return (
    <section className="ha-workspace">
      <div className="ha-page-header mb-5">
        <h1 className="ha-title">User administration</h1>
        <p className="ha-summary">Manage workspace roles and account access.</p>
      </div>
      <div className="overflow-hidden rounded-2xl border border-ha-line bg-white shadow-sm">
        <div className="hidden md:grid md:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,.7fr)_auto] gap-4 border-b border-ha-line bg-ha-canvas px-5 py-3 text-xs font-semibold uppercase tracking-wide text-ha-secondary">
          <span>User</span><span>Role</span><span>Status</span><span>Actions</span>
        </div>
        {availableUsers.map((user) => (
          <div key={user.uid} className="grid grid-cols-[minmax(0,1fr)_auto] md:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,.7fr)_auto] items-center gap-x-4 gap-y-2 border-b border-slate-100 px-5 py-4 last:border-0">
            <div className="col-span-2 min-w-0 break-words md:col-span-1"><p className="font-medium text-ha-ink">{user.displayName || user.email}</p><p className="text-xs text-ha-secondary">{user.email}</p></div>
            <select aria-label={`Role for ${user.email}`} value={user.role} disabled={user.uid === currentUser.uid || busyUid === user.uid} onChange={async (event) => { setBusyUid(user.uid); try { await updateUserRole(user.uid, event.target.value as UserRole); } finally { setBusyUid(''); } }} className="row-start-3 md:row-auto min-w-0 rounded-lg border border-slate-300 px-2 py-2 text-sm">
              {roles.map((role) => <option key={role} value={role}>{role.replace('_', ' ')}</option>)}
            </select>
            <span className="col-span-2 md:col-span-1 text-sm capitalize text-ha-secondary">{user.status || (user.isApproved === false ? 'pending' : 'approved')}</span>
            <button type="button" aria-label={`Delete ${user.email}`} disabled={user.uid === currentUser.uid || busyUid === user.uid} onClick={async () => { if (!window.confirm(`Delete ${user.email}?`)) return; setBusyUid(user.uid); try { await deleteUser(user.uid); } finally { setBusyUid(''); } }} className="rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-700 disabled:cursor-not-allowed disabled:opacity-40">Delete</button>
          </div>
        ))}
        {availableUsers.length === 0 && <p className="px-5 py-10 text-center text-sm text-ha-secondary">No Firebase users found.</p>}
      </div>
    </section>
  );
}

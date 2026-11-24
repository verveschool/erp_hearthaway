'use client';

import { LeadFieldSelect } from '@/components/LeadFieldSelect';
import { WorkspaceSearch } from '@/components/WorkspaceSearch';
import { ConfirmActionDialog } from '@/components/ConfirmActionDialog';
import { WorkspaceNotice } from '@/components/WorkspaceNotice';
import { useWorkspaceView } from '@/hooks/use-workspace-view';
import { useState } from 'react';
import { useHearthAway } from '@/lib/context';
import type { AppUser, UserRole } from '@/lib/types';

const roles: UserRole[] = ['management', 'portfolio_owner', 'sales', 'finance', 'partner'];

export default function ManagementPage() {
  const { currentUser, availableUsers, updateUserRole, deleteUser } = useHearthAway();
  const [target, setTarget] = useState<AppUser | null>(null);
  const [notice, setNotice] = useState('');
  const [search, setSearch] = useWorkspaceView<string>(currentUser.uid, 'search', '');
  const isManagement = currentUser.role === 'management' || currentUser.role === 'admin';

  if (!isManagement) return <section className="p-8">You do not have access to user management.</section>;
  const visibleUsers = availableUsers.filter(user => [user.displayName, user.email, user.role.replace('_', ' ')].some(value => value?.toLowerCase().includes(search.trim().toLowerCase())));

  return (
    <section className="ha-workspace">
      <WorkspaceNotice message={notice} clear={setNotice} />
      <div className="ha-page-header mb-5">
        <h1 className="ha-title">User administration</h1>
        <p className="ha-summary">Manage workspace roles and account access.</p>
      </div>
      <div className="mb-4 flex flex-wrap items-center gap-3"><WorkspaceSearch label="Search users" placeholder="Search by name, email or role" value={search} onChange={setSearch} /><span role="status" className="text-sm text-ha-secondary">{visibleUsers.length} {visibleUsers.length === 1 ? 'user' : 'users'}</span></div>
      <div className="overflow-hidden rounded-2xl border border-ha-line bg-white shadow-sm">
        <div className="hidden md:grid md:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,.7fr)_auto] gap-4 border-b border-ha-line bg-ha-canvas px-5 py-3 text-xs font-semibold uppercase tracking-wide text-ha-secondary">
          <span>User</span><span>Role</span><span>Status</span><span>Actions</span>
        </div>
        {visibleUsers.map((user) => (
          <div key={user.uid} className="grid grid-cols-[minmax(0,1fr)_auto] md:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,.7fr)_auto] items-center gap-x-4 gap-y-2 border-b border-slate-100 px-5 py-4 last:border-0">
            <div className="col-span-2 min-w-0 break-words md:col-span-1"><p className="font-medium text-ha-ink">{user.displayName || user.email}</p><p className="text-xs text-ha-secondary">{user.email}</p></div>
            <LeadFieldSelect aria-label={`Role for ${user.email}`} value={user.role} disabled={user.uid === currentUser.uid || target?.uid === user.uid}
              onSave={role => updateUserRole(user.uid, role as UserRole)} className="row-start-3 md:row-auto min-w-0 rounded-lg border border-slate-300 px-2 py-2 text-sm">
              {roles.map((role) => <option key={role} value={role}>{role.replace('_', ' ')}</option>)}
            </LeadFieldSelect>
            <span className="col-span-2 md:col-span-1 text-sm capitalize text-ha-secondary">{user.status || (user.isApproved === false ? 'pending' : 'approved')}</span>
            <button type="button" aria-label={`Delete ${user.email}`} disabled={user.uid === currentUser.uid || target?.uid === user.uid} onClick={() => setTarget(user)} className="ha-text-action text-rose-700 disabled:opacity-40">{user.uid === currentUser.uid ? 'Your account' : 'Remove'}</button>
          </div>
        ))}
        {visibleUsers.length === 0 && <p className="px-5 py-10 text-center text-sm text-ha-secondary">{search ? 'No users match this search.' : 'No users to display.'}</p>}
      </div>
      {target && <ConfirmActionDialog title={`Remove ${target.displayName || target.email}?`} description="This removes the account from the active workspace and revokes its approved status." action="Remove account" onClose={() => setTarget(null)} onConfirm={async () => { await deleteUser(target.uid); setNotice('Account removed.'); }} />}
    </section>
  );
}

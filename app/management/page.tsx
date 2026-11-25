'use client';

import { LeadFieldSelect } from '@/components/LeadFieldSelect';
import { WorkspaceSearch } from '@/components/WorkspaceSearch';
import { ConfirmActionDialog } from '@/components/ConfirmActionDialog';
import { WorkspaceNotice } from '@/components/WorkspaceNotice';
import { useWorkspaceView } from '@/hooks/use-workspace-view';
import { Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useHearthAway } from '@/lib/context';
import type { AppUser, UserRole } from '@/lib/types';

const roles: UserRole[] = ['admin', 'management', 'finance', 'partner'];

export default function ManagementPage() {
  const { currentUser, availableUsers, internalRole, deleteUser, updateUserRole } = useHearthAway();
  const [target, setTarget] = useState<AppUser | null>(null);
  const [notice, setNotice] = useState('');
  const [search, setSearch] = useWorkspaceView<string>(currentUser.uid, 'search', '');
  const isManagement = !!internalRole;

  if (!isManagement) return <section className="p-8">You do not have access to user management.</section>;
  const visibleUsers = availableUsers.filter(user => [user.displayName, user.email, user.role.replace('_', ' ')].some(value => value?.toLowerCase().includes(search.trim().toLowerCase())));

  return (
    <section className="ha-workspace workspace-compact users-workspace">
      <WorkspaceNotice message={notice} clear={setNotice} />
      <div className="ha-page-header">
        <h1 className="ha-title">Users</h1>
      <div className="workspace-toolbar users-toolbar"><WorkspaceSearch label="Search users" placeholder="Search by name, email or role" value={search} onChange={setSearch} /><span role="status" className="text-sm text-ha-secondary">{visibleUsers.length} {visibleUsers.length === 1 ? 'user' : 'users'}</span></div>
      </div>
      <div className="overflow-hidden rounded-xl border border-ha-line bg-white">
        <div className="hidden md:grid md:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,.7fr)_auto] gap-4 border-b border-ha-line bg-ha-canvas px-4 py-2.5 text-xs font-semibold text-ha-secondary">
          <span>User</span><span>Account type</span><span>Status</span><span>Actions</span>
        </div>
        {visibleUsers.map((user) => (
          <div key={user.uid} className="grid grid-cols-[minmax(0,1fr)_minmax(44px,auto)] md:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,.7fr)_auto] items-center gap-x-3 gap-y-1.5 border-b border-ha-line px-4 py-2.5 last:border-0">
            <div className="min-w-0 break-words"><p className="font-medium text-ha-ink">{user.displayName || user.email}</p>{user.displayName && user.displayName !== user.email && <p className="text-xs text-ha-secondary">{user.email}</p>}</div>
            {internalRole === 'admin' && user.uid !== currentUser.uid ? (
              <LeadFieldSelect aria-label={`Account type for ${user.email}`} value={user.role}
                className="min-w-0 max-w-full rounded-lg border border-ha-line px-2 py-2 text-sm"
                onSave={role => updateUserRole(user.uid, role as UserRole)}>
                {!roles.includes(user.role) && <option value={user.role}>{user.role.replaceAll('_', ' ')}</option>}
                {roles.map(role => <option key={role} value={role}>{role[0].toUpperCase() + role.slice(1)}</option>)}
              </LeadFieldSelect>
            ) : <span className="text-sm capitalize text-ha-secondary">{user.role.replaceAll('_', ' ')}</span>}
            <span className="user-row-status text-sm capitalize text-ha-secondary">{user.status || (user.isApproved === false ? 'pending' : 'approved')}</span>
            <div className="user-row-action">
              {user.uid === currentUser.uid ? <span className="text-xs text-ha-secondary">You</span> : (
                <button type="button" aria-label={`Remove ${user.email}`} title="Remove user"
                  disabled={target?.uid === user.uid} onClick={() => setTarget(user)} className="workspace-icon-button">
                  <Trash2 size={18} aria-hidden="true" />
                </button>
              )}
            </div>
          </div>
        ))}
        {visibleUsers.length === 0 && <p className="px-5 py-10 text-center text-sm text-ha-secondary">{search ? 'No users match this search.' : 'No users to display.'}</p>}
      </div>
      {target && <ConfirmActionDialog title={`Remove ${target.displayName || target.email}?`} description="This removes the account from the active workspace and revokes its approved status." action="Remove account" onClose={() => setTarget(null)} onConfirm={async () => { await deleteUser(target.uid); setNotice('Account removed.'); }} />}
    </section>
  );
}

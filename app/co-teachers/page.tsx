'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/src/lib/supabase';
import { pageShell } from '@/src/lib/designTokens';
import { useAppHeader } from '@/components/layout/AppHeader';
import {
  revokeInvite,
  getOrgInvites,
  getOrgCollaborators,
  removeCollaborator,
  type InviteRole,
} from '@/src/lib/invites';

// ─── Types ────────────────────────────────────────────────────────────────────

type Invite = {
  id: string;
  code: string;
  email: string;
  role: InviteRole;
  status: 'pending' | 'accepted' | 'declined' | 'revoked' | 'expired';
  expires_at: string;
  created_at: string;
};

type Collaborator = {
  id: string;
  user_id: string;
  email: string;
  name: string;
  role: InviteRole;
  permissions: Record<string, boolean>;
  added_at: string;
};

// ─── Status helpers ───────────────────────────────────────────────────────────

const STATUS_STYLES: Record<string, string> = {
  pending:  'bg-emerald-50 text-emerald-700 border border-emerald-200',
  accepted: 'bg-blue-50 text-blue-700 border border-blue-200',
  revoked:  'bg-red-50 text-red-500 border border-red-200',
  expired:  'bg-gray-100 text-gray-400 border border-gray-200',
  declined: 'bg-amber-50 text-amber-600 border border-amber-200',
};

const ROLE_LABELS: Record<string, string> = {
  co_teacher: 'Co-Teacher',
  aide: 'Aide',
};

function isExpired(expiresAt: string) {
  return new Date(expiresAt) < new Date();
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function CoTeachersPage() {
  const router = useRouter();
  useAppHeader({ title: '👩‍🏫 Co-Teachers', backHref: '/tools' });
  const supabase = createClient();

  const [orgId, setOrgId] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [revoking, setRevoking] = useState<string | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form state
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<InviteRole>('co_teacher');

  // ── Auth guard ──────────────────────────────────────────────────────────────
  useEffect(() => {
    async function checkAuth() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/'); return; }

      const { data: membership } = await supabase
        .from('user_organizations')
        .select('role, organization_id')
        .eq('user_id', user.id)
        .single();

      if (membership?.role !== 'admin') {
        router.push('/dashboard');
        return;
      }

      setCurrentUserId(user.id);
      setOrgId(membership.organization_id);
      setLoading(false);
    }
    checkAuth();
  }, []);

  // Load data once orgId is set
  useEffect(() => {
    if (orgId) loadData();
  }, [orgId]);

  // ── Data loading ────────────────────────────────────────────────────────────
  async function loadData() {
    if (!orgId) return;
    const [{ data: inviteData }, { data: collabData }] = await Promise.all([
      getOrgInvites(orgId),
      getOrgCollaborators(orgId),
    ]);
    if (inviteData) setInvites(inviteData as Invite[]);
    if (collabData) setCollaborators(collabData as Collaborator[]);
  }

  // ── Generate invite ─────────────────────────────────────────────────────────
  async function handleGenerate() {
    if (!orgId) return;
    setError('');
    setSuccess('');
    setGenerating(true);

    const res = await fetch('/api/invites/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: inviteEmail.trim() || undefined,
        role: inviteRole,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      setError(data.error || 'Failed to send invite');
    } else {
      setSuccess(inviteEmail ? `Invitation sent to ${inviteEmail}` : 'Invite code generated');
      setInviteEmail('');
      await loadData();
    }
    setGenerating(false);
  }

  // ── Copy code ───────────────────────────────────────────────────────────────
  function handleCopy(code: string) {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  }

  // ── Revoke invite ───────────────────────────────────────────────────────────
  async function handleRevoke(inviteId: string) {
    setRevoking(inviteId);
    await revokeInvite(inviteId);
    await loadData();
    setRevoking(null);
  }

  // ── Remove collaborator ─────────────────────────────────────────────────────
  async function handleRemove(collaboratorId: string) {
    setRemoving(collaboratorId);
    await removeCollaborator(collaboratorId);
    await loadData();
    setRemoving(null);
  }

  // ── Render states ───────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const pendingInvites = invites.filter(i => i.status === 'pending' && !isExpired(i.expires_at));
  const pastInvites = invites.filter(i => i.status !== 'pending' || isExpired(i.expires_at));

  // ── Main render ─────────────────────────────────────────────────────────────
  return (
    <div style={pageShell.root}>
      <header style={pageShell.topBar}>
        <div style={pageShell.topBarLeft}>
          <button style={pageShell.headerBtn} onClick={() => router.push('/tools')}>
            ← Tools
          </button>
          <div style={pageShell.pageTitle}>👩‍🏫 Co-Teachers</div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-10 space-y-8" style={{ paddingBottom: 100 }}>

        {/* Success/Error messages */}
        {success && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl px-4 py-3 text-sm font-medium">
            ✅ {success}
          </div>
        )}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl px-4 py-3 text-sm font-medium">
            ⚠️ {error}
          </div>
        )}

        {/* Active collaborators */}
        <section className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="font-semibold text-slate-800">
              Active Members
              {collaborators.length > 0 && (
                <span className="ml-2 text-xs font-normal text-slate-400">
                  {collaborators.length} {collaborators.length === 1 ? 'person' : 'people'}
                </span>
              )}
            </h2>
          </div>

          {collaborators.length === 0 ? (
            <div className="px-5 py-8 text-center text-slate-400 text-sm">
              No co-teachers yet. Generate an invite code below to get started.
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {collaborators.map(c => (
                <li key={c.id} className="px-5 py-4 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="font-medium text-slate-800 truncate">
                      {c.name !== c.email ? c.name : c.email}
                    </p>
                    {c.name !== c.email && (
                      <p className="text-xs text-slate-400 truncate">{c.email}</p>
                    )}
                    <p className="text-xs text-slate-500 mt-0.5">
                      {ROLE_LABELS[c.role] ?? c.role} · Joined {formatDate(c.added_at)}
                    </p>
                  </div>
                  <button
                    onClick={() => handleRemove(c.id)}
                    disabled={removing === c.id}
                    className="text-xs text-red-400 hover:text-red-600 shrink-0 transition-colors disabled:opacity-40"
                  >
                    {removing === c.id ? 'Removing…' : 'Remove'}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Generate new invite */}
        <section className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="font-semibold text-slate-800">Generate Invite Code</h2>
          </div>
          <div className="px-5 py-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-600">
                  Email address
                  <span className="ml-1 font-normal text-slate-400">(optional)</span>
                </label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={e => setInviteEmail(e.target.value)}
                  placeholder="teacher@example.com"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
                />
                <p className="text-xs text-slate-400">
                  If set, only this person can redeem the code.
                </p>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-600">Role</label>
                <select
                  value={inviteRole}
                  onChange={e => setInviteRole(e.target.value as InviteRole)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
                >
                  <option value="co_teacher">Co-Teacher — can edit lessons & events</option>
                  <option value="aide">Aide — view progress only</option>
                </select>
              </div>
            </div>

            <button
              onClick={handleGenerate}
              disabled={generating}
              className="bg-indigo-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {generating ? 'Generating…' : 'Generate Code'}
            </button>
          </div>
        </section>

        {/* Pending invites */}
        {pendingInvites.length > 0 && (
          <section className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <h2 className="font-semibold text-slate-800">
                Pending Invites
                <span className="ml-2 text-xs font-normal text-slate-400">
                  {pendingInvites.length} active
                </span>
              </h2>
            </div>
            <ul className="divide-y divide-slate-100">
              {pendingInvites.map(inv => (
                <li key={inv.id} className="px-5 py-4 flex items-center justify-between gap-4">
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-lg font-bold tracking-widest text-slate-800">
                        {inv.code}
                      </span>
                      <button
                        onClick={() => handleCopy(inv.code)}
                        className="text-xs text-indigo-500 hover:text-indigo-700 transition-colors"
                      >
                        {copiedCode === inv.code ? '✓ Copied' : 'Copy'}
                      </button>
                    </div>
                    <p className="text-xs text-slate-400">
                      {inv.email ? `For: ${inv.email}` : 'Open invite'} ·{' '}
                      {ROLE_LABELS[inv.role] ?? inv.role} ·{' '}
                      Expires {formatDate(inv.expires_at)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLES[inv.status]}`}>
                      {inv.status}
                    </span>
                    <button
                      onClick={() => handleRevoke(inv.id)}
                      disabled={revoking === inv.id}
                      className="text-xs text-red-400 hover:text-red-600 transition-colors disabled:opacity-40"
                    >
                      {revoking === inv.id ? 'Revoking…' : 'Revoke'}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Past invites */}
        {pastInvites.length > 0 && (
          <section className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <h2 className="font-semibold text-slate-800 text-sm text-slate-500">
                Past Invites
              </h2>
            </div>
            <ul className="divide-y divide-slate-100">
              {pastInvites.map(inv => (
                <li key={inv.id} className="px-5 py-4 flex items-center justify-between gap-4 opacity-60">
                  <div className="min-w-0 space-y-1">
                    <span className="font-mono text-base font-bold tracking-widest text-slate-500">
                      {inv.code}
                    </span>
                    <p className="text-xs text-slate-400">
                      {inv.email ? `For: ${inv.email}` : 'Open invite'} ·{' '}
                      {ROLE_LABELS[inv.role] ?? inv.role}
                    </p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${STATUS_STYLES[inv.status] ?? STATUS_STYLES.expired}`}>
                    {isExpired(inv.expires_at) && inv.status === 'pending' ? 'expired' : inv.status}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

      </div>
    </div>
  );
}


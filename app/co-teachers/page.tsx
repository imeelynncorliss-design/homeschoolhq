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
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#3d3a52' }}>
        <div style={{ color: '#7c3aed', fontWeight: 700, fontFamily: "'Nunito', sans-serif" }}>Loading…</div>
      </div>
    );
  }

  const pendingInvites = invites.filter(i => i.status === 'pending' && !isExpired(i.expires_at));
  const pastInvites = invites.filter(i => i.status !== 'pending' || isExpired(i.expires_at));

  const rowStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, padding: '14px 20px', borderBottom: '1px solid rgba(0,0,0,0.06)' };
  const labelStyle: React.CSSProperties = { fontSize: 12, fontWeight: 700, color: '#1a1a2e', marginBottom: 2 };
  const subStyle: React.CSSProperties = { fontSize: 12, color: '#6b7280', fontWeight: 600 };
const inputStyle: React.CSSProperties = { width: '100%', padding: '9px 12px', borderRadius: 10, border: '1.5px solid #e5e7eb', fontSize: 13, color: '#1f2937', background: '#fff', fontFamily: "'Nunito', sans-serif", boxSizing: 'border-box' };
  const dangerBtn: React.CSSProperties = { background: 'none', border: 'none', fontSize: 12, fontWeight: 700, color: '#ef4444', cursor: 'pointer', fontFamily: "'Nunito', sans-serif", flexShrink: 0 };

  const STATUS_INLINE: Record<string, React.CSSProperties> = {
    pending:  { background: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0' },
    accepted: { background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe' },
    revoked:  { background: '#fef2f2', color: '#ef4444', border: '1px solid #fca5a5' },
    expired:  { background: '#f9fafb', color: '#9ca3af', border: '1px solid #e5e7eb' },
    declined: { background: '#fffbeb', color: '#d97706', border: '1px solid #fde68a' },
  };

  // ── Main render ─────────────────────────────────────────────────────────────
  return (
    <div style={{ ...pageShell.root, paddingBottom: 100 }}>
      <main style={pageShell.main}>

        {/* Success/Error messages */}
        {success && (
          <div style={{ margin: '0 0 12px', padding: '12px 16px', background: '#ecfdf5', border: '1.5px solid #a7f3d0', borderRadius: 10, fontSize: 13, color: '#059669', fontWeight: 700 }}>
            ✅ {success}
          </div>
        )}
        {error && (
          <div style={{ margin: '0 0 12px', padding: '12px 16px', background: '#fef2f2', border: '1.5px solid #fca5a5', borderRadius: 10, fontSize: 13, color: '#dc2626', fontWeight: 700 }}>
            ⚠️ {error}
          </div>
        )}

        {/* Active collaborators */}
        <div className="hr-section-label" style={{ marginBottom: 8 }}>ACTIVE MEMBERS</div>
        <div className="hr-card" style={{ marginBottom: 20, overflow: 'hidden' }}>
          {collaborators.length === 0 ? (
            <div style={{ padding: '32px 20px', textAlign: 'center', color: '#6b7280', fontSize: 13, fontWeight: 600 }}>
              No co-teachers yet. Generate an invite code below to get started.
            </div>
          ) : (
            collaborators.map((c, idx) => (
              <div key={c.id} style={{ ...rowStyle, borderBottom: idx < collaborators.length - 1 ? '1px solid rgba(0,0,0,0.06)' : 'none' }}>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={labelStyle}>{c.name !== c.email ? c.name : c.email}</div>
                  {c.name !== c.email && <div style={subStyle}>{c.email}</div>}
                  <div style={subStyle}>{ROLE_LABELS[c.role] ?? c.role} · Joined {formatDate(c.added_at)}</div>
                </div>
                <button style={dangerBtn} onClick={() => handleRemove(c.id)} disabled={removing === c.id}>
                  {removing === c.id ? 'Removing…' : 'Remove'}
                </button>
              </div>
            ))
          )}
        </div>

        {/* Generate new invite */}
        <div className="hr-section-label" style={{ marginBottom: 8 }}>GENERATE INVITE CODE</div>
        <div className="hr-card" style={{ padding: '18px 20px', marginBottom: 20 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 14 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#1a1a2e', display: 'block', marginBottom: 6 }}>
                Email address <span style={{ fontWeight: 600, color: '#6b7280' }}>(optional)</span>
              </label>
              <input type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="teacher@example.com" style={inputStyle} />
              <div style={{ fontSize: 11, color: '#4b5563', fontWeight: 600, marginTop: 4 }}>If set, only this person can redeem the code.</div>
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#4b5563', display: 'block', marginBottom: 6 }}>Role</label>
              <select value={inviteRole} onChange={e => setInviteRole(e.target.value as InviteRole)} style={inputStyle}>
                <option value="co_teacher">Co-Teacher — can edit lessons & events</option>
                <option value="aide">Aide — view progress only</option>
              </select>
            </div>
          </div>
          <button
            onClick={handleGenerate}
            disabled={generating}
            style={{ padding: '11px 20px', background: 'linear-gradient(135deg, #7c3aed, #a855f7)', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 800, cursor: generating ? 'not-allowed' : 'pointer', opacity: generating ? 0.6 : 1, fontFamily: "'Nunito', sans-serif" }}
          >
            {generating ? 'Generating…' : 'Generate Code'}
          </button>
        </div>

        {/* Pending invites */}
        {pendingInvites.length > 0 && (
          <>
            <div className="hr-section-label" style={{ marginBottom: 8 }}>PENDING INVITES <span style={{ fontWeight: 600, opacity: 0.7 }}>({pendingInvites.length} active)</span></div>
            <div className="hr-card" style={{ marginBottom: 20, overflow: 'hidden' }}>
              {pendingInvites.map((inv, idx) => (
                <div key={inv.id} style={{ ...rowStyle, borderBottom: idx < pendingInvites.length - 1 ? '1px solid rgba(0,0,0,0.06)' : 'none' }}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                      <span style={{ fontFamily: 'monospace', fontSize: 17, fontWeight: 800, letterSpacing: 3, color: '#1a1a2e' }}>{inv.code}</span>
                      <button onClick={() => handleCopy(inv.code)} style={{ fontSize: 11, fontWeight: 700, color: '#7c3aed', background: 'none', border: 'none', cursor: 'pointer', fontFamily: "'Nunito', sans-serif" }}>
                        {copiedCode === inv.code ? '✓ Copied' : 'Copy'}
                      </button>
                    </div>
                    <div style={subStyle}>{inv.email ? `For: ${inv.email}` : 'Open invite'} · {ROLE_LABELS[inv.role] ?? inv.role} · Expires {formatDate(inv.expires_at)}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 10px', borderRadius: 20, ...STATUS_INLINE[inv.status] }}>{inv.status}</span>
                    <button style={dangerBtn} onClick={() => handleRevoke(inv.id)} disabled={revoking === inv.id}>
                      {revoking === inv.id ? 'Revoking…' : 'Revoke'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Past invites */}
        {pastInvites.length > 0 && (
          <>
            <div className="hr-section-label" style={{ marginBottom: 8 }}>PAST INVITES</div>
            <div className="hr-card" style={{ marginBottom: 20, overflow: 'hidden' }}>
              {pastInvites.map((inv, idx) => (
                <div key={inv.id} style={{ ...rowStyle, borderBottom: idx < pastInvites.length - 1 ? '1px solid rgba(0,0,0,0.06)' : 'none' }}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <span style={{ fontFamily: 'monospace', fontSize: 15, fontWeight: 800, letterSpacing: 2, color: '#6b7280' }}>{inv.code}</span>
                    <div style={subStyle}>{inv.email ? `For: ${inv.email}` : 'Open invite'} · {ROLE_LABELS[inv.role] ?? inv.role}</div>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 10px', borderRadius: 20, flexShrink: 0, ...(STATUS_INLINE[inv.status] ?? STATUS_INLINE.expired) }}>
                    {isExpired(inv.expires_at) && inv.status === 'pending' ? 'expired' : inv.status}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}

      </main>
    </div>
  );
}


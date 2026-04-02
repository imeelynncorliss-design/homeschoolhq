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

type Task = {
  id: string;
  title: string;
  notes: string | null;
  status: 'pending' | 'completed';
  assigned_to_collaborator_id: string | null;
  due_date: string | null;
  completed_at: string | null;
  created_at: string;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

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

  // Core state
  const [orgId, setOrgId]               = useState<string | null>(null);
  const [invites, setInvites]           = useState<Invite[]>([]);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [loading, setLoading]           = useState(true);
  const [generating, setGenerating]     = useState(false);
  const [copiedCode, setCopiedCode]     = useState<string | null>(null);
  const [revoking, setRevoking]         = useState<string | null>(null);
  const [removing, setRemoving]         = useState<string | null>(null);
  const [error, setError]               = useState('');
  const [success, setSuccess]           = useState('');

  // Invite form
  const [inviteEmail, setInviteEmail]   = useState('');
  const [inviteRole, setInviteRole]     = useState<InviteRole>('co_teacher');

  // Task state
  const [tasks, setTasks]               = useState<Task[]>([]);
  const [taskTitle, setTaskTitle]       = useState('');
  const [taskAssignTo, setTaskAssignTo] = useState<string>('anyone');
  const [taskNotes, setTaskNotes]       = useState('');
  const [addingTask, setAddingTask]     = useState(false);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [togglingTask, setTogglingTask] = useState<string | null>(null);
  const [deletingTask, setDeletingTask] = useState<string | null>(null);
  const [changingRole, setChangingRole] = useState<string | null>(null);

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

      if (membership?.role !== 'admin') { router.push('/dashboard'); return; }

      setOrgId(membership.organization_id);
      setLoading(false);
    }
    checkAuth();
  }, []);

  useEffect(() => { if (orgId) loadData(); }, [orgId]);

  // ── Data loading ─────────────────────────────────────────────────────────────
  async function loadData() {
    if (!orgId) return;
    const [{ data: inviteData }, { data: collabData }, { data: taskData }] = await Promise.all([
      getOrgInvites(orgId),
      getOrgCollaborators(orgId),
      supabase
        .from('co_teacher_tasks')
        .select('*')
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false }),
    ]);
    if (inviteData)  setInvites(inviteData as Invite[]);
    if (collabData)  setCollaborators(collabData as Collaborator[]);
    if (taskData)    setTasks(taskData as Task[]);
  }

  // ── Generate invite ──────────────────────────────────────────────────────────
  async function handleGenerate() {
    if (!orgId) return;
    setError(''); setSuccess(''); setGenerating(true);
    const res = await fetch('/api/invites/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: inviteEmail.trim() || undefined, role: inviteRole }),
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

  function handleCopy(code: string) {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  }

  async function handleRevoke(inviteId: string) {
    setRevoking(inviteId);
    await revokeInvite(inviteId);
    await loadData();
    setRevoking(null);
  }

  async function handleRemove(collaboratorId: string) {
    setRemoving(collaboratorId);
    await removeCollaborator(collaboratorId);
    await loadData();
    setRemoving(null);
  }

  async function handleChangeRole(collaboratorId: string, newRole: InviteRole) {
    setChangingRole(collaboratorId);
    await supabase
      .from('family_collaborators')
      .update({ role: newRole, updated_at: new Date().toISOString() })
      .eq('id', collaboratorId);
    await loadData();
    setChangingRole(null);
  }

  // ── Task handlers ────────────────────────────────────────────────────────────
  async function handleAddTask() {
    if (!orgId || !taskTitle.trim()) return;
    setAddingTask(true);
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from('co_teacher_tasks').insert({
      organization_id: orgId,
      created_by: user!.id,
      title: taskTitle.trim(),
      notes: taskNotes.trim() || null,
      assigned_to_collaborator_id: taskAssignTo === 'anyone' ? null : taskAssignTo,
      status: 'pending',
    });
    setTaskTitle('');
    setTaskNotes('');
    setTaskAssignTo('anyone');
    setShowTaskForm(false);
    await loadData();
    setAddingTask(false);
  }

  async function handleToggleTask(task: Task) {
    setTogglingTask(task.id);
    const next = task.status === 'pending' ? 'completed' : 'pending';
    await supabase.from('co_teacher_tasks').update({
      status: next,
      completed_at: next === 'completed' ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    }).eq('id', task.id);
    await loadData();
    setTogglingTask(null);
  }

  async function handleDeleteTask(taskId: string) {
    setDeletingTask(taskId);
    await supabase.from('co_teacher_tasks').delete().eq('id', taskId);
    await loadData();
    setDeletingTask(null);
  }

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#3d3a52' }}>
        <div style={{ width: 36, height: 36, borderRadius: '50%', border: '3px solid #e9d5ff', borderTopColor: '#7c3aed', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  const pendingInvites = invites.filter(i => i.status === 'pending' && !isExpired(i.expires_at));
  const pastInvites    = invites.filter(i => i.status !== 'pending' || isExpired(i.expires_at));
  const pendingTasks   = tasks.filter(t => t.status === 'pending');
  const doneTasks      = tasks.filter(t => t.status === 'completed');

  // ── Shared styles ────────────────────────────────────────────────────────────
  const rowStyle: React.CSSProperties    = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, padding: '14px 20px', borderBottom: '1px solid rgba(0,0,0,0.06)' };
  const labelStyle: React.CSSProperties  = { fontSize: 12, fontWeight: 700, color: '#1a1a2e', marginBottom: 2 };
  const subStyle: React.CSSProperties    = { fontSize: 12, color: '#6b7280', fontWeight: 600 };
  const inputStyle: React.CSSProperties  = { width: '100%', padding: '9px 12px', borderRadius: 10, border: '1.5px solid #e5e7eb', fontSize: 13, color: '#1f2937', background: '#fff', fontFamily: "'Nunito', sans-serif", boxSizing: 'border-box' };
  const dangerBtn: React.CSSProperties   = { background: 'none', border: 'none', fontSize: 12, fontWeight: 700, color: '#ef4444', cursor: 'pointer', fontFamily: "'Nunito', sans-serif", flexShrink: 0 };

  const STATUS_BADGE: Record<string, React.CSSProperties> = {
    pending:   { background: '#fffbeb', color: '#d97706', border: '1px solid #fde68a' },
    completed: { background: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0' },
  };
  const STATUS_INLINE: Record<string, React.CSSProperties> = {
    pending:  { background: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0' },
    accepted: { background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe' },
    revoked:  { background: '#fef2f2', color: '#ef4444', border: '1px solid #fca5a5' },
    expired:  { background: '#f9fafb', color: '#9ca3af', border: '1px solid #e5e7eb' },
    declined: { background: '#fffbeb', color: '#d97706', border: '1px solid #fde68a' },
  };

  function collaboratorName(id: string | null) {
    if (!id) return 'Anyone';
    return collaborators.find(c => c.id === id)?.name || 'Unknown';
  }

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div style={{ ...pageShell.root, paddingBottom: 100 }}>
      <main style={pageShell.main}>

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

        {/* ── Active members ─────────────────────────────────────────────────── */}
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
                  <div style={subStyle}>Joined {formatDate(c.added_at)}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                  {/* Role toggle */}
                  <select
                    value={c.role}
                    disabled={changingRole === c.id}
                    onChange={e => handleChangeRole(c.id, e.target.value as InviteRole)}
                    style={{ fontSize: 11, fontWeight: 700, color: '#7c3aed', background: '#ede9fe', border: 'none', borderRadius: 8, padding: '3px 8px', cursor: 'pointer', fontFamily: "'Nunito', sans-serif" }}
                  >
                    <option value="co_teacher">Co-Teacher</option>
                    <option value="aide">Aide</option>
                  </select>
                  <button style={dangerBtn} onClick={() => handleRemove(c.id)} disabled={removing === c.id}>
                    {removing === c.id ? 'Removing…' : 'Remove'}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* ── Tasks ─────────────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <div className="hr-section-label" style={{ marginBottom: 0 }}>
            TASKS {tasks.length > 0 && <span style={{ fontWeight: 600, opacity: 0.7 }}>({pendingTasks.length} pending)</span>}
          </div>
          <button
            onClick={() => setShowTaskForm(v => !v)}
            style={{ fontSize: 12, fontWeight: 700, color: '#7c3aed', background: 'rgba(124,58,237,0.1)', border: 'none', borderRadius: 8, padding: '4px 12px', cursor: 'pointer', fontFamily: "'Nunito', sans-serif" }}
          >
            {showTaskForm ? 'Cancel' : '+ Add task'}
          </button>
        </div>

        {/* Task creation form */}
        {showTaskForm && (
          <div className="hr-card" style={{ padding: '16px 18px', marginBottom: 12 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <input
                placeholder="Task title (e.g. Grade math worksheets)"
                value={taskTitle}
                onChange={e => setTaskTitle(e.target.value)}
                style={inputStyle}
                onKeyDown={e => { if (e.key === 'Enter' && taskTitle.trim()) handleAddTask(); }}
              />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', display: 'block', marginBottom: 4 }}>Assign to</label>
                  <select value={taskAssignTo} onChange={e => setTaskAssignTo(e.target.value)} style={inputStyle}>
                    <option value="anyone">Anyone</option>
                    {collaborators.map(c => (
                      <option key={c.id} value={c.id}>{c.name || c.email}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', display: 'block', marginBottom: 4 }}>Notes (optional)</label>
                  <input placeholder="Any extra context…" value={taskNotes} onChange={e => setTaskNotes(e.target.value)} style={inputStyle} />
                </div>
              </div>
              <button
                onClick={handleAddTask}
                disabled={!taskTitle.trim() || addingTask}
                style={{ alignSelf: 'flex-start', padding: '8px 18px', background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 9, fontSize: 13, fontWeight: 800, cursor: taskTitle.trim() ? 'pointer' : 'not-allowed', opacity: taskTitle.trim() ? 1 : 0.5, fontFamily: "'Nunito', sans-serif" }}
              >
                {addingTask ? 'Adding…' : 'Add Task'}
              </button>
            </div>
          </div>
        )}

        {/* Task list */}
        {tasks.length === 0 ? (
          <div className="hr-card" style={{ padding: '24px 20px', textAlign: 'center', color: '#6b7280', fontSize: 13, fontWeight: 600, marginBottom: 20 }}>
            No tasks yet. Add one to let co-teachers know what needs doing.
          </div>
        ) : (
          <div className="hr-card" style={{ marginBottom: 20, overflow: 'hidden' }}>
            {[...pendingTasks, ...doneTasks].map((task, idx, arr) => (
              <div key={task.id} style={{
                ...rowStyle,
                borderBottom: idx < arr.length - 1 ? '1px solid rgba(0,0,0,0.06)' : 'none',
                opacity: task.status === 'completed' ? 0.65 : 1,
              }}>
                {/* Checkbox */}
                <button
                  onClick={() => handleToggleTask(task)}
                  disabled={togglingTask === task.id}
                  style={{
                    width: 22, height: 22, borderRadius: 6, flexShrink: 0, cursor: 'pointer',
                    background: task.status === 'completed' ? '#7c3aed' : '#fff',
                    border: task.status === 'completed' ? '2px solid #7c3aed' : '2px solid #d1d5db',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#fff', fontSize: 13, fontWeight: 800,
                  }}
                >
                  {task.status === 'completed' ? '✓' : ''}
                </button>

                {/* Task info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#1a1a2e', textDecoration: task.status === 'completed' ? 'line-through' : 'none' }}>
                    {task.title}
                  </div>
                  <div style={subStyle}>
                    → {collaboratorName(task.assigned_to_collaborator_id)}
                    {task.notes && <span style={{ color: '#9ca3af' }}> · {task.notes}</span>}
                    {task.status === 'completed' && task.completed_at && (
                      <span> · Done {formatDate(task.completed_at)}</span>
                    )}
                  </div>
                </div>

                {/* Status + delete */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 9px', borderRadius: 20, ...STATUS_BADGE[task.status] }}>
                    {task.status === 'completed' ? 'Done' : 'Pending'}
                  </span>
                  <button style={dangerBtn} onClick={() => handleDeleteTask(task.id)} disabled={deletingTask === task.id}>
                    {deletingTask === task.id ? '…' : '✕'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Generate invite ──────────────────────────────────────────────── */}
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
            style={{ padding: '11px 20px', background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 800, cursor: generating ? 'not-allowed' : 'pointer', opacity: generating ? 0.6 : 1, fontFamily: "'Nunito', sans-serif" }}
          >
            {generating ? 'Generating…' : 'Generate Code'}
          </button>
        </div>

        {/* ── Pending invites ──────────────────────────────────────────────── */}
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

        {/* ── Past invites ─────────────────────────────────────────────────── */}
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

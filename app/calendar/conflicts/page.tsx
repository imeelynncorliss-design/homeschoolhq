// app/calendar/conflicts/page.tsx
'use client'

import { useState, useEffect } from 'react';
import { supabase } from '@/src/lib/supabase';
import { getOrganizationId } from '@/src/lib/getOrganizationId';
import { useRouter } from 'next/navigation';
import { AlertCircle, Calendar, Clock, CheckCircle, Loader2 } from 'lucide-react';
import { useAppHeader } from '@/components/layout/AppHeader';
import { pageShell } from '@/src/lib/designTokens';

interface ConflictEvent {
  id: string;
  lesson_title: string;
  lesson_start: string;
  lesson_end: string;
  work_event_title: string;
  work_event_start: string;
  work_event_end: string;
  conflict_type: string;
  resolution_status: 'unresolved' | 'resolved' | 'ignored';
  resolved_at?: string;
  resolution_action?: string;
}

const btnPrimary: React.CSSProperties = {
  flex: 1, padding: '10px 14px', background: 'linear-gradient(135deg, #7c3aed, #a855f7)',
  color: '#fff', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 800,
  cursor: 'pointer', fontFamily: "'Nunito', sans-serif",
};
const btnGhost: React.CSSProperties = {
  padding: '10px 14px', background: 'rgba(255,255,255,0.7)',
  border: '2px solid rgba(124,58,237,0.3)', borderRadius: 10,
  fontSize: 13, fontWeight: 700, color: '#7c3aed', cursor: 'pointer',
  fontFamily: "'Nunito', sans-serif",
};

export default function ConflictsPage() {
  const router = useRouter();
  useAppHeader({ title: '⚠️ Schedule Conflicts', backHref: '/calendar/connect' });
  const [orgId, setOrgId] = useState<string | null>(null);
  const [conflicts, setConflicts] = useState<ConflictEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<'all' | 'unresolved' | 'resolved'>('all');

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { orgId: oid } = await getOrganizationId(user.id)
      if (!oid) return
      setOrgId(oid)
      await fetchConflicts(oid)
    }
    init()
  }, []);

  const fetchConflicts = async (resolvedOrgId?: string) => {
    const id = resolvedOrgId ?? orgId
    if (!id) return
    try {
      setLoading(true);
      const response = await fetch(`/api/calendar/conflicts?organizationId=${id}`);
      if (!response.ok) throw new Error('Failed to fetch conflicts');
      const data = await response.json();
      setConflicts(data.conflicts || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResolve = async (conflictId: string, action: string) => {
    if (!orgId) return
    try {
      const response = await fetch('/api/calendar/conflicts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conflictId, action, organizationId: orgId }),
      });
      if (!response.ok) throw new Error('Failed to resolve conflict');
      await fetchConflicts();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const filteredConflicts = conflicts.filter(c => {
    if (filter === 'all') return true;
    if (filter === 'unresolved') return c.resolution_status === 'unresolved';
    return c.resolution_status !== 'unresolved';
  });

  const formatTime = (d: string) => new Date(d).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  const formatDate = (d: string) => new Date(d).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

  const unresolvedCount = conflicts.filter(c => c.resolution_status === 'unresolved').length;
  const resolvedCount = conflicts.filter(c => c.resolution_status !== 'unresolved').length;

  return (
    <div style={{ ...pageShell.root, paddingBottom: 100 }}>
      <main style={pageShell.main}>

        <p style={{ color: 'rgba(255,255,255,0.75)', fontWeight: 600, fontSize: 14, margin: '0 0 20px', lineHeight: 1.5 }}>
          Review and resolve conflicts between work meetings and homeschool lessons.
        </p>

        {/* Error */}
        {error && (
          <div style={{ margin: '0 0 16px', padding: '12px 16px', background: '#fef2f2', border: '1.5px solid #fca5a5', borderRadius: 10, fontSize: 13, color: '#dc2626', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertCircle size={16} /> {error}
          </div>
        )}

        {/* Filter pills */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          {([
            { key: 'all',        label: 'All Conflicts' },
            { key: 'unresolved', label: '⚠️ Unresolved' },
            { key: 'resolved',   label: '✓ Resolved' },
          ] as { key: typeof filter; label: string }[]).map(f => (
            <button key={f.key} onClick={() => setFilter(f.key)} style={{
              padding: '8px 16px', borderRadius: 99, fontFamily: "'Nunito', sans-serif",
              fontWeight: 800, fontSize: 13, cursor: 'pointer',
              background: filter === f.key ? 'linear-gradient(135deg, #7c3aed, #a855f7)' : 'rgba(255,255,255,0.7)',
              color: filter === f.key ? '#fff' : '#7c3aed',
              border: filter === f.key ? 'none' : '2px solid rgba(124,58,237,0.3)',
            }}>
              {f.label}
            </button>
          ))}
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
          {[
            { label: 'Total Conflicts', value: conflicts.length, color: '#1a1a2e', icon: <AlertCircle size={22} style={{ color: '#7c3aed' }} /> },
            { label: 'Unresolved',      value: unresolvedCount,  color: '#d97706', icon: <AlertCircle size={22} style={{ color: '#d97706' }} /> },
            { label: 'Resolved',        value: resolvedCount,    color: '#059669', icon: <CheckCircle size={22} style={{ color: '#059669' }} /> },
          ].map(s => (
            <div key={s.label} className="hr-card" style={{ padding: '16px 18px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: 11, color: '#6b7280', fontWeight: 700, marginBottom: 4 }}>{s.label}</div>
                  <div style={{ fontSize: 28, fontWeight: 900, color: s.color, fontFamily: "'Nunito', sans-serif" }}>{s.value}</div>
                </div>
                {s.icon}
              </div>
            </div>
          ))}
        </div>

        {/* Loading */}
        {loading && (
          <div className="hr-card" style={{ padding: '40px 20px', textAlign: 'center' }}>
            <Loader2 size={28} style={{ color: '#7c3aed', margin: '0 auto 12px' }} className="animate-spin" />
            <p style={{ color: '#6b7280', fontWeight: 600, fontSize: 13 }}>Loading conflicts...</p>
          </div>
        )}

        {/* Empty state */}
        {!loading && filteredConflicts.length === 0 && (
          <div className="hr-card" style={{ padding: '48px 20px', textAlign: 'center' }}>
            <CheckCircle size={48} style={{ color: '#059669', margin: '0 auto 12px' }} />
            <div style={{ fontSize: 17, fontWeight: 900, color: '#1a1a2e', marginBottom: 6, fontFamily: "'Nunito', sans-serif" }}>
              {filter === 'all' ? 'No Conflicts Found' : `No ${filter} conflicts`}
            </div>
            <p style={{ fontSize: 13, color: '#6b7280', fontWeight: 600, marginBottom: 16 }}>
              {filter === 'all' ? 'Your schedule is conflict-free! 🎉' : 'All conflicts in this category have been addressed.'}
            </p>
            {filter !== 'all' && (
              <button onClick={() => setFilter('all')} style={{ ...btnGhost, display: 'inline-block' }}>
                View All Conflicts
              </button>
            )}
          </div>
        )}

        {/* Conflict cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filteredConflicts.map(conflict => {
            const isUnresolved = conflict.resolution_status === 'unresolved';
            return (
              <div key={conflict.id} className="hr-card" style={{ overflow: 'hidden', borderLeft: `4px solid ${isUnresolved ? '#f59e0b' : '#10b981'}` }}>
                {/* Header */}
                <div style={{ padding: '16px 20px 12px', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 10px', borderRadius: 20, background: isUnresolved ? '#fffbeb' : '#ecfdf5', color: isUnresolved ? '#d97706' : '#059669', border: `1px solid ${isUnresolved ? '#fde68a' : '#a7f3d0'}` }}>
                      {isUnresolved ? '⚠️ Needs Attention' : '✓ Resolved'}
                    </span>
                    <span style={{ fontSize: 12, color: '#6b7280', fontWeight: 600 }}>{formatDate(conflict.lesson_start)}</span>
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 900, color: '#1a1a2e', fontFamily: "'Nunito', sans-serif" }}>Scheduling Conflict</div>
                  <div style={{ fontSize: 12, color: '#6b7280', fontWeight: 600, marginTop: 2 }}>
                    {conflict.conflict_type === 'overlap' ? 'Time overlap detected' : 'Schedule conflict'}
                  </div>
                </div>

                <div style={{ padding: '14px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {/* Lesson */}
                  <div style={{ background: '#ede9fe', border: '1px solid rgba(124,58,237,0.2)', borderRadius: 10, padding: '12px 14px', display: 'flex', gap: 10 }}>
                    <Calendar size={18} style={{ color: '#7c3aed', flexShrink: 0, marginTop: 2 }} />
                    <div>
                      <div style={{ fontWeight: 800, fontSize: 13, color: '#4c1d95', marginBottom: 2 }}>Homeschool Lesson</div>
                      <div style={{ fontWeight: 700, fontSize: 14, color: '#1a1a2e' }}>{conflict.lesson_title}</div>
                      <div style={{ fontSize: 12, color: '#6b21a8', fontWeight: 600, marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Clock size={13} /> {formatTime(conflict.lesson_start)} – {formatTime(conflict.lesson_end)}
                      </div>
                    </div>
                  </div>

                  {/* Work event */}
                  <div style={{ background: '#fef3c7', border: '1px solid #fde68a', borderRadius: 10, padding: '12px 14px', display: 'flex', gap: 10 }}>
                    <Calendar size={18} style={{ color: '#d97706', flexShrink: 0, marginTop: 2 }} />
                    <div>
                      <div style={{ fontWeight: 800, fontSize: 13, color: '#92400e', marginBottom: 2 }}>Work Meeting</div>
                      <div style={{ fontWeight: 700, fontSize: 14, color: '#1a1a2e' }}>{conflict.work_event_title}</div>
                      <div style={{ fontSize: 12, color: '#92400e', fontWeight: 600, marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Clock size={13} /> {formatTime(conflict.work_event_start)} – {formatTime(conflict.work_event_end)}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  {isUnresolved ? (
                    <div style={{ display: 'flex', gap: 8, paddingTop: 4 }}>
                      <button onClick={() => handleResolve(conflict.id, 'reschedule_lesson')} style={btnPrimary}>
                        Reschedule Lesson
                      </button>
                      <button onClick={() => handleResolve(conflict.id, 'keep_both')} style={btnPrimary}>
                        Keep Both
                      </button>
                      <button onClick={() => handleResolve(conflict.id, 'ignore')} style={btnGhost}>
                        Ignore
                      </button>
                    </div>
                  ) : (
                    <div style={{ fontSize: 13, color: '#059669', fontWeight: 700 }}>
                      ✓ Resolved {conflict.resolved_at && `on ${formatDate(conflict.resolved_at)}`}
                      {conflict.resolution_action && ` — ${conflict.resolution_action}`}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Back button as pill */}
        <div style={{ textAlign: 'center', marginTop: 24 }}>
          <button onClick={() => router.push('/calendar/connect')} style={{
            padding: '11px 24px', background: 'rgba(255,255,255,0.7)',
            border: '2px solid rgba(124,58,237,0.3)', borderRadius: 99,
            fontSize: 14, fontWeight: 800, color: '#7c3aed', cursor: 'pointer',
            fontFamily: "'Nunito', sans-serif",
          }}>
            ← Back to Calendar Settings
          </button>
        </div>

      </main>
    </div>
  );
}

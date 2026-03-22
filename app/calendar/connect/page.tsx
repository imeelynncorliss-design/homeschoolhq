// app/calendar/connect/page.tsx
'use client'

import { Suspense } from 'react'
import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Calendar,
  AlertCircle,
  CheckCircle,
  Loader2,
  Trash2,
  RefreshCw,
  Settings,
  ArrowRight,
  XCircle
} from 'lucide-react';
import type { CalendarConnection } from '@/src/types/calendar';
import { useAppHeader } from '@/components/layout/AppHeader';
import { supabase } from '@/src/lib/supabase';
import { getOrganizationId } from '@/src/lib/getOrganizationId';
import { pageShell } from '@/src/lib/designTokens';

const btnPrimary: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 8,
  padding: '11px 20px', background: 'linear-gradient(135deg, #7c3aed, #a855f7)',
  color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 800,
  cursor: 'pointer', fontFamily: "'Nunito', sans-serif",
};
const btnGhost: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 6,
  padding: '9px 16px', background: 'rgba(255,255,255,0.7)',
  border: '2px solid rgba(124,58,237,0.3)', borderRadius: 10,
  fontSize: 13, fontWeight: 700, color: '#7c3aed', cursor: 'pointer',
  fontFamily: "'Nunito', sans-serif",
};
const btnIcon: React.CSSProperties = {
  background: 'none', border: 'none', cursor: 'pointer', padding: 8,
  borderRadius: 8, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
};

function CalendarConnectContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  useAppHeader({ title: '📅 Calendar Sync', backHref: '/tools' });
  const [orgId, setOrgId] = useState<string | null>(null);
  const [connections, setConnections] = useState<CalendarConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [syncFeedback, setSyncFeedback] = useState<Record<string, {
    type: 'success' | 'error' | null;
    message: string;
  }>>({});

  useEffect(() => {
    const oauthError = searchParams.get('error');
    const oauthSuccess = searchParams.get('success');
    if (oauthError) {
      setError(`Connection failed: ${oauthError}`);
    } else if (oauthSuccess) {
      setSuccess('Calendar connected successfully!');
      loadConnections();
    }
  }, [searchParams]);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/'); return }
      const { orgId: oid } = await getOrganizationId(user.id)
      if (!oid) { router.push('/onboarding'); return }
      setOrgId(oid)
      await loadConnections(oid)
    }
    init()
  }, []);

  const loadConnections = async (resolvedOrgId?: string) => {
    const id = resolvedOrgId ?? orgId
    if (!id) return
    try {
      setLoading(true);
      const response = await fetch(`/api/calendar/connections?organizationId=${id}`);
      const data = await response.json();
      setConnections(data.connections || []);
    } catch {
      setError('Failed to load calendar connections');
    } finally {
      setLoading(false);
    }
  };

  const connectGoogle = () => {
    window.location.href = '/api/calendar/oauth/google';
  };

  const syncConnection = async (connectionId: string) => {
    try {
      setSyncing(connectionId);
      setSyncFeedback(prev => ({ ...prev, [connectionId]: { type: null, message: '' } }));
      const response = await fetch('/api/calendar/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ connectionId }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Sync failed');
      setSyncFeedback(prev => ({
        ...prev,
        [connectionId]: { type: 'success', message: data.message || `Successfully synced! Processed ${data.eventsProcessed || 0} events.` }
      }));
      await loadConnections();
      setTimeout(() => setSyncFeedback(prev => ({ ...prev, [connectionId]: { type: null, message: '' } })), 5000);
    } catch (err: any) {
      setSyncFeedback(prev => ({
        ...prev,
        [connectionId]: { type: 'error', message: err.message || 'Failed to sync calendar. Please try again.' }
      }));
      setTimeout(() => setSyncFeedback(prev => ({ ...prev, [connectionId]: { type: null, message: '' } })), 5000);
    } finally {
      setSyncing(null);
    }
  };

  const disconnectCalendar = async (connectionId: string) => {
    if (!confirm('Are you sure you want to disconnect this calendar?')) return;
    try {
      const response = await fetch(`/api/calendar/connections/${connectionId}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to disconnect');
      setSuccess('Calendar disconnected');
      loadConnections();
    } catch {
      setError('Failed to disconnect calendar');
    }
  };

  const getStatusPill = (status: string) => {
    const variants: Record<string, React.CSSProperties> = {
      completed: { background: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0' },
      failed:    { background: '#fef2f2', color: '#ef4444', border: '1px solid #fca5a5' },
      pending:   { background: '#fffbeb', color: '#d97706', border: '1px solid #fde68a' },
      syncing:   { background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe' },
    };
    const labels: Record<string, string> = { completed: 'Active', failed: 'Error', pending: 'Pending', syncing: 'Syncing' };
    const s = variants[status] ?? variants.pending;
    return (
      <span style={{ ...s, fontSize: 11, fontWeight: 700, padding: '2px 10px', borderRadius: 20, whiteSpace: 'nowrap' as const }}>
        {labels[status] ?? 'Pending'}
      </span>
    );
  };

  return (
    <div style={{ ...pageShell.root, paddingBottom: 100 }}>
      <main style={pageShell.main}>

        {/* Description */}
        <p style={{ color: 'rgba(255,255,255,0.75)', fontWeight: 600, fontSize: 14, margin: '0 0 20px', lineHeight: 1.5 }}>
          Connect your Google Calendar to automatically detect conflicts with your homeschool schedule.
        </p>

        {/* Error */}
        {error && (
          <div style={{ margin: '0 0 16px', padding: '12px 16px', background: '#fef2f2', border: '1.5px solid #fca5a5', borderRadius: 10, fontSize: 13, color: '#dc2626', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertCircle size={16} /> {error}
          </div>
        )}

        {/* Success (no connections yet) */}
        {success && !connections.length && (
          <div style={{ margin: '0 0 16px', padding: '12px 16px', background: '#ecfdf5', border: '1.5px solid #a7f3d0', borderRadius: 10, fontSize: 13, color: '#059669', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
            <CheckCircle size={16} /> {success}
          </div>
        )}

        {/* Success guide (with connections) */}
        {success && connections.length > 0 && (
          <div className="hr-card" style={{ marginBottom: 20, padding: '20px 24px' }}>
            <div style={{ fontSize: 16, fontWeight: 900, color: '#059669', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
              <CheckCircle size={18} /> 🎉 Calendar Connected Successfully!
            </div>
            <p style={{ fontSize: 13, color: '#4b5563', fontWeight: 600, margin: '0 0 16px' }}>
              Your work calendar is now connected. Here&apos;s what happens next:
            </p>
            {[
              { n: 1, title: 'Automatic Sync', desc: 'Your work calendar syncs every 15 minutes. You can also click "Sync Now" below anytime.' },
              { n: 2, title: 'Create Your Lessons', desc: 'Go to your lesson planner and schedule your homeschool lessons for the week.' },
              { n: 3, title: 'Check for Conflicts', desc: "We'll automatically detect when work meetings conflict with lessons and help you resolve them." },
            ].map(({ n, title, desc }) => (
              <div key={n} style={{ display: 'flex', gap: 14, marginBottom: 14 }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg, #7c3aed, #a855f7)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 14, flexShrink: 0 }}>{n}</div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 14, color: '#1a1a2e' }}>{title}</div>
                  <div style={{ fontSize: 13, color: '#4b5563', fontWeight: 600 }}>{desc}</div>
                </div>
              </div>
            ))}
            <div style={{ display: 'flex', gap: 10, marginTop: 8, paddingTop: 16, borderTop: '1px solid rgba(0,0,0,0.06)' }}>
              <button onClick={() => router.push('/dashboard')} style={btnPrimary}>
                Go to Dashboard <ArrowRight size={16} />
              </button>
              <button onClick={() => router.push('/calendar/conflicts')} style={btnGhost}>
                View Conflicts
              </button>
            </div>
          </div>
        )}

        {/* Connect section (no connections) */}
        {connections.length === 0 && (
          <>
            <div className="hr-section-label" style={{ marginBottom: 8 }}>CONNECT CALENDAR</div>
            <div className="hr-card" style={{ padding: '20px 24px', marginBottom: 20 }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: '#1a1a2e', marginBottom: 4 }}>Connect Calendar</div>
              <div style={{ fontSize: 13, color: '#6b7280', fontWeight: 600, marginBottom: 16 }}>
                Add a work calendar to enable automatic conflict detection
              </div>
              <button onClick={connectGoogle} style={btnPrimary}>
                <Calendar size={18} /> Connect Google Calendar
              </button>
            </div>
          </>
        )}

        {/* Connected Calendars */}
        <div className="hr-section-label" style={{ marginBottom: 8 }}>CONNECTED CALENDARS</div>
        <div className="hr-card" style={{ marginBottom: 20, overflow: 'hidden' }}>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '32px 0' }}>
              <Loader2 size={24} style={{ color: '#7c3aed' }} className="animate-spin" />
            </div>
          ) : connections.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 20px', color: '#6b7280', fontSize: 13, fontWeight: 600 }}>
              No calendars connected yet. Connect your work calendar above to get started.
            </div>
          ) : (
            connections.map((connection) => (
              <div key={connection.id}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Calendar size={18} style={{ color: '#2563eb' }} />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 800, fontSize: 14, color: '#1a1a2e' }}>{connection.calendar_name}</div>
                      <div style={{ fontSize: 12, color: '#6b7280', fontWeight: 600 }}>{connection.provider_account_email}</div>
                      {connection.last_sync_at && (
                        <div style={{ fontSize: 11, color: '#9ca3af', fontWeight: 600, marginTop: 2 }}>
                          Last synced: {new Date(connection.last_sync_at).toLocaleString()}
                        </div>
                      )}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                    {getStatusPill(connection.last_sync_status)}
                    <button style={btnIcon} onClick={() => syncConnection(connection.id)} disabled={syncing === connection.id} title="Sync now">
                      {syncing === connection.id
                        ? <Loader2 size={16} style={{ color: '#7c3aed' }} className="animate-spin" />
                        : <RefreshCw size={16} style={{ color: '#7c3aed' }} />}
                    </button>
                    <button style={btnIcon} onClick={() => router.push(`/calendar/settings/${connection.id}`)} title="Settings">
                      <Settings size={16} style={{ color: '#7c3aed' }} />
                    </button>
                    <button style={btnIcon} onClick={() => disconnectCalendar(connection.id)} title="Disconnect">
                      <Trash2 size={16} style={{ color: '#ef4444' }} />
                    </button>
                  </div>
                </div>

                {connection.last_sync_status === 'pending' && (
                  <div style={{ margin: '0 20px 16px', padding: '14px 16px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10 }}>
                    <div style={{ display: 'flex', gap: 10 }}>
                      <AlertCircle size={18} style={{ color: '#d97706', flexShrink: 0, marginTop: 2 }} />
                      <div>
                        <div style={{ fontWeight: 800, fontSize: 14, color: '#92400e', marginBottom: 4 }}>Initial Sync Required</div>
                        <p style={{ fontSize: 13, color: '#78350f', fontWeight: 600, margin: '0 0 12px' }}>
                          Your calendar is connected but needs to complete its first sync to activate.
                        </p>
                        <button onClick={() => syncConnection(connection.id)} disabled={syncing === connection.id} style={{ ...btnPrimary, opacity: syncing === connection.id ? 0.6 : 1, cursor: syncing === connection.id ? 'not-allowed' : 'pointer' }}>
                          {syncing === connection.id ? <><Loader2 size={14} className="animate-spin" /> Syncing...</> : <><RefreshCw size={14} /> Sync Now</>}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {syncFeedback[connection.id]?.type && (
                  <div style={{
                    margin: '0 20px 16px', padding: '12px 16px', borderRadius: 10,
                    display: 'flex', alignItems: 'flex-start', gap: 8,
                    background: syncFeedback[connection.id].type === 'success' ? '#ecfdf5' : '#fef2f2',
                    border: `1px solid ${syncFeedback[connection.id].type === 'success' ? '#a7f3d0' : '#fca5a5'}`,
                  }}>
                    {syncFeedback[connection.id].type === 'success'
                      ? <CheckCircle size={16} style={{ color: '#059669', flexShrink: 0, marginTop: 2 }} />
                      : <XCircle size={16} style={{ color: '#ef4444', flexShrink: 0, marginTop: 2 }} />}
                    <span style={{ fontSize: 13, fontWeight: 700, color: syncFeedback[connection.id].type === 'success' ? '#059669' : '#dc2626' }}>
                      {syncFeedback[connection.id].message}
                    </span>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* What You'll See */}
        {connections.length > 0 && (
          <>
            <div className="hr-section-label" style={{ marginBottom: 8 }}>WHAT YOU&apos;LL SEE</div>
            <div className="hr-card" style={{ padding: '20px 24px', marginBottom: 20 }}>
              {[
                { emoji: '🔄', title: 'Automatic Sync (Every 15 Minutes)', desc: "Your work events sync automatically in the background. You don't need to do anything!", accent: '#ede9fe' },
                { emoji: '⚠️', title: 'Conflict Warnings', desc: 'When you schedule a lesson that conflicts with a work meeting, you\'ll see a warning.', accent: '#fffbeb' },
                { emoji: '🚫', title: 'Auto-Block Work Time (Optional)', desc: 'Click the ⚙️ gear icon next to your calendar to enable "Auto-Block Work Events" and automatically block work meeting times.', accent: '#f0fdf4' },
              ].map(({ emoji, title, desc, accent }) => (
                <div key={title} style={{ display: 'flex', gap: 14, marginBottom: 16 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 12, background: accent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>{emoji}</div>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 14, color: '#1a1a2e', marginBottom: 2 }}>{title}</div>
                    <div style={{ fontSize: 13, color: '#4b5563', fontWeight: 600 }}>{desc}</div>
                  </div>
                </div>
              ))}
              <div style={{ paddingTop: 12, borderTop: '1px solid rgba(0,0,0,0.06)', marginTop: 4 }}>
                <Link href="/calendar/conflicts" style={{ fontSize: 14, fontWeight: 700, color: '#7c3aed', textDecoration: 'none' }}>
                  View All Conflicts →
                </Link>
              </div>
            </div>
          </>
        )}

        {/* How It Works */}
        <div className="hr-section-label" style={{ marginBottom: 8 }}>HOW IT WORKS</div>
        <div className="hr-card" style={{ padding: '20px 24px' }}>
          {[
            { n: 1, title: 'Connect Your Work Calendar', desc: 'Securely connect Google Calendar to HomeschoolReady' },
            { n: 2, title: 'Automatic Sync Every 15 Minutes', desc: 'Work events sync automatically in the background — no manual action needed' },
            { n: 3, title: 'Get Conflict Warnings', desc: 'See alerts when scheduling lessons during work meetings — helping you avoid double-booking' },
          ].map(({ n, title, desc }) => (
            <div key={n} style={{ display: 'flex', gap: 14, marginBottom: n < 3 ? 16 : 0 }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg, #ede9fe, #dbeafe)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 15, color: '#7c3aed', flexShrink: 0 }}>{n}</div>
              <div>
                <div style={{ fontWeight: 800, fontSize: 14, color: '#1a1a2e', marginBottom: 2 }}>{title}</div>
                <div style={{ fontSize: 13, color: '#4b5563', fontWeight: 600 }}>{desc}</div>
              </div>
            </div>
          ))}
        </div>

      </main>
    </div>
  );
}

export default function CalendarConnectPage() {
  return (
    <Suspense fallback={<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#3d3a52' }}><Loader2 size={32} style={{ color: '#7c3aed' }} className="animate-spin" /></div>}>
      <CalendarConnectContent />
    </Suspense>
  )
}

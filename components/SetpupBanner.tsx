'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/src/lib/supabase/client';
import SetupWizard from '@/components/SetupWizard';

interface SetupBannerProps {
  organizationId: string;
}

export default function SetupBanner({ organizationId }: SetupBannerProps) {
  const [showWizard, setShowWizard] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [setupComplete, setSetupComplete] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkSetupStatus();
  }, [organizationId]);

  async function checkSetupStatus() {
    try {
      const supabase = createClient();

      const { data: kids } = await supabase
        .from('kids')
        .select('id, date_of_birth, grade_level, learning_style')
        .eq('organization_id', organizationId);

      const { data: subjects } = await supabase
        .from('subjects')
        .select('id')
        .eq('organization_id', organizationId)
        .limit(1);

      const hasSubjects = (subjects ?? []).length > 0;
      const allKidsComplete =
        (kids ?? []).length > 0 &&
        (kids ?? []).every(
          (k: { date_of_birth: string | null; grade_level: string | null }) =>
            k.date_of_birth && k.grade_level
        );

      setSetupComplete(hasSubjects && allKidsComplete);
    } catch (err) {
      console.error('Error checking setup status:', err);
    } finally {
      setLoading(false);
    }
  }

  function handleWizardComplete() {
    setShowWizard(false);
    setSetupComplete(true);
  }

  if (loading || setupComplete || dismissed) return null;

  const s = {
    banner: {
      background: 'linear-gradient(135deg, #7C3AED 0%, #6D28D9 50%, #5B21B6 100%)',
      borderRadius: '16px',
      padding: '18px 24px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '16px',
      margin: '0 0 24px',
      boxShadow: '0 4px 20px rgba(124, 58, 237, 0.3)',
      position: 'relative' as const,
      overflow: 'hidden',
    },
    shimmer: {
      position: 'absolute' as const,
      top: 0, left: 0, right: 0, bottom: 0,
      background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.06) 50%, transparent 100%)',
      pointerEvents: 'none' as const,
    },
    iconWrap: {
      width: '44px',
      height: '44px',
      borderRadius: '12px',
      background: 'rgba(255,255,255,0.15)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '22px',
      flexShrink: 0,
    },
    textBlock: { flex: 1 },
    title: {
      color: '#fff',
      fontWeight: 700,
      fontSize: '15px',
      margin: '0 0 2px',
    },
    subtitle: {
      color: 'rgba(255,255,255,0.8)',
      fontSize: '13px',
      margin: 0,
    },
    actions: {
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      flexShrink: 0,
    },
    startBtn: {
      background: '#fff',
      color: '#7C3AED',
      border: 'none',
      borderRadius: '10px',
      padding: '10px 20px',
      fontWeight: 700,
      fontSize: '14px',
      cursor: 'pointer',
      whiteSpace: 'nowrap' as const,
      boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
    },
    dismissBtn: {
      background: 'transparent',
      color: 'rgba(255,255,255,0.7)',
      border: 'none',
      fontSize: '20px',
      cursor: 'pointer',
      padding: '4px 8px',
      lineHeight: 1,
      borderRadius: '6px',
    },
  };

  return (
    <>
      <div style={s.banner}>
        <div style={s.shimmer} />
        <div style={s.iconWrap}>🎯</div>
        <div style={s.textBlock}>
          <p style={s.title}>Finish setting up your school</p>
          <p style={s.subtitle}>
            Add subjects & complete your child profiles — takes about 2 minutes
          </p>
        </div>
        <div style={s.actions}>
          <button style={s.startBtn} onClick={() => setShowWizard(true)}>
            Let's Go →
          </button>
          <button
            style={s.dismissBtn}
            onClick={() => setDismissed(true)}
            title="Dismiss"
          >
            ×
          </button>
        </div>
      </div>

      {showWizard && (
        <SetupWizard
          organizationId={organizationId}
          onComplete={handleWizardComplete}
          onClose={() => setShowWizard(false)}
        />
      )}
    </>
  );
}
'use client'

import { useRouter } from 'next/navigation'

interface UpgradeModalProps {
  onClose: () => void
  featureName?: string
}

export default function UpgradeModal({ onClose, featureName }: UpgradeModalProps) {
  const router = useRouter()

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20,
        fontFamily: "'Nunito', sans-serif",
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#fff', borderRadius: 24,
          boxShadow: '0 24px 64px rgba(0,0,0,0.2)',
          padding: '32px 28px', maxWidth: 400, width: '100%',
          textAlign: 'center',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ fontSize: 44, marginBottom: 14 }}>🔒</div>

        <h2 style={{ fontSize: 18, fontWeight: 900, color: '#1e1b4b', margin: '0 0 10px' }}>
          Feature Not Available
        </h2>

        <p style={{ fontSize: 14, color: '#6b7280', lineHeight: 1.65, margin: '0 0 24px' }}>
          {featureName
            ? <><strong>{featureName}</strong> is not available on your current plan.</>
            : <>The feature you're trying to access is not available on your current subscription plan.</>
          }
          {' '}Would you like to explore upgrade options?
        </p>

        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={onClose}
            style={{
              flex: 1, padding: '11px 0', borderRadius: 12,
              border: '2px solid #e5e7eb', background: '#f9fafb',
              color: '#6b7280', fontWeight: 700, fontSize: 13,
              cursor: 'pointer', fontFamily: "'Nunito', sans-serif",
            }}
          >
            No, stay here
          </button>
          <button
            onClick={() => { onClose(); router.push('/pricing') }}
            style={{
              flex: 1, padding: '11px 0', borderRadius: 12,
              border: 'none',
              background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #a855f7 100%)',
              color: '#fff', fontWeight: 800, fontSize: 13,
              cursor: 'pointer', fontFamily: "'Nunito', sans-serif",
              boxShadow: '0 4px 14px rgba(124,58,237,0.35)',
            }}
          >
            Yes, explore plans →
          </button>
        </div>
      </div>
    </div>
  )
}

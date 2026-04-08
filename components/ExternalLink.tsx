'use client'

import { useState } from 'react'

interface ExternalLinkProps {
  href: string
  children: React.ReactNode
  className?: string
  style?: React.CSSProperties
}

export function ExternalLink({ href, children, className, style }: ExternalLinkProps) {
  const [showModal, setShowModal] = useState(false)

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className={className}
        style={{ ...style, cursor: 'pointer' }}
      >
        {children}
      </button>

      {showModal && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(0,0,0,0.45)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '16px',
            fontFamily: "'Nunito', sans-serif",
          }}
          onClick={() => setShowModal(false)}
        >
          <div
            style={{
              background: '#fff', borderRadius: 20,
              boxShadow: '0 24px 64px rgba(0,0,0,0.18)',
              padding: '32px 28px', maxWidth: 400, width: '100%',
              textAlign: 'center',
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ fontSize: 40, marginBottom: 12 }}>🔗</div>
            <h2 style={{ fontSize: 18, fontWeight: 900, color: '#1e1b4b', margin: '0 0 8px' }}>
              You're leaving HomeschoolReady
            </h2>
            <p style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.6, margin: '0 0 24px' }}>
              This link will open in a new tab. HomeschoolReady does not control the content of external sites.
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => setShowModal(false)}
                style={{
                  flex: 1, padding: '11px 0', borderRadius: 12,
                  border: '2px solid #e5e7eb', background: '#f9fafb',
                  color: '#6b7280', fontWeight: 700, fontSize: 13, cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  // Ensure the URL has a protocol so it opens externally, not relative to the app
                  const url = /^https?:\/\//i.test(href) ? href : `https://${href}`
                  window.open(url, '_blank', 'noopener,noreferrer')
                  setShowModal(false)
                }}
                style={{
                  flex: 1, padding: '11px 0', borderRadius: 12,
                  border: 'none', background: 'linear-gradient(90deg,#4f46e5,#7c3aed)',
                  color: '#fff', fontWeight: 800, fontSize: 13, cursor: 'pointer',
                }}
              >
                Continue →
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

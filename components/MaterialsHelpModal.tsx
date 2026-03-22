'use client'

interface MaterialsHelpModalProps {
  onClose: () => void
}

export default function MaterialsHelpModal({ onClose }: MaterialsHelpModalProps) {
  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 99999,
        background: 'rgba(15,10,40,0.55)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#3d3a52', borderRadius: 20, width: '100%', maxWidth: 540,
          boxShadow: '0 24px 64px rgba(0,0,0,0.2)', overflow: 'hidden',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
          padding: '20px 24px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#fff' }}>🧰 How Materials Works</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 2 }}>
              What to add and why it matters
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff',
              width: 30, height: 30, borderRadius: '50%', fontSize: 18,
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* What is it */}
          <div style={{ background: '#f5f3ff', borderRadius: 12, padding: '16px 18px', border: '1.5px solid #ede9fe' }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: '#4f46e5', marginBottom: 6 }}>
              📦 What is the Materials library?
            </div>
            <p style={{ fontSize: 13, color: '#374151', lineHeight: 1.6, margin: 0 }}>
              Your Materials library is a catalog of everything you use to teach — textbooks, online subscriptions, physical supplies, and digital resources. Adding them here makes them available across the app.
            </p>
          </div>

          {/* AI Lesson Generator */}
          <div style={{ background: '#f0fdf4', borderRadius: 12, padding: '16px 18px', border: '1.5px solid #bbf7d0' }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: '#166534', marginBottom: 6 }}>
              ✨ Used in AI Lesson Generator
            </div>
            <p style={{ fontSize: 13, color: '#374151', lineHeight: 1.6, margin: 0 }}>
              When you generate a lesson with AI, HomeschoolReady automatically considers your <strong>physical materials</strong> — like craft supplies, science kits, or manipulatives — and suggests activities that use what you already have at home. No more generic lessons that require items you don't own.
            </p>
          </div>

          {/* 4 types */}
          <div>
            <div style={{ fontSize: 13, fontWeight: 800, color: '#e9d5ff', marginBottom: 10 }}>
              The 4 material types:
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { icon: '📚', type: 'Textbooks', desc: 'Curriculum books and workbooks your child uses for structured learning.' },
                { icon: '🔑', type: 'Subscriptions', desc: 'Online programs like Khan Academy, IXL, or Outschool. Store login info here for easy access.' },
                { icon: '🧰', type: 'Physical Materials', desc: 'Hands-on supplies — science kits, art materials, math manipulatives. These are referenced by the AI Lesson Generator.' },
                { icon: '💻', type: 'Digital Resources', desc: 'PDFs, videos, apps, or downloads you use for teaching.' },
              ].map(item => (
                <div key={item.type} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <span style={{ fontSize: 20, flexShrink: 0, marginTop: 1 }}>{item.icon}</span>
                  <div>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#f3f4f6' }}>{item.type}: </span>
                    <span style={{ fontSize: 13, color: '#d1d5db' }}>{item.desc}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Pro tip */}
          <div style={{ background: '#fffbeb', borderRadius: 12, padding: '14px 16px', border: '1.5px solid #fde68a', display: 'flex', gap: 10 }}>
            <span style={{ fontSize: 18, flexShrink: 0 }}>💡</span>
            <p style={{ fontSize: 12, color: '#92400e', lineHeight: 1.6, margin: 0 }}>
              <strong>Pro tip:</strong> The more physical materials you add, the better your AI-generated lessons become. Try adding your science kit, art supplies, or building blocks and watch the lesson suggestions improve.
            </p>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
              border: 'none', borderRadius: 100, padding: '10px 24px',
              fontSize: 13, fontWeight: 700, color: '#fff',
              cursor: 'pointer', alignSelf: 'flex-end',
            }}
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  )
}
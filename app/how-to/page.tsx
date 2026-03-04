'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import AuthGuard from '@/components/AuthGuard'
import { useAppHeader } from '@/components/layout/AppHeader'

const FAQS = [
  {
    q: 'How do I get started?',
    a: 'Add your children using the + button on the dashboard, then import your curriculum or create lessons manually. Use the calendar to track progress.',
  },
  {
    q: "What's the best way to organize?",
    a: 'Start by setting up your school year in the Control Center, then add your children and create or import lessons. Group lessons by subject for the clearest overview.',
  },
  {
    q: 'Can I track multiple children?',
    a: 'Yes! HomeschoolReady supports multiple children. Each child has their own lesson list, progress tracking, and compliance record.',
  },
  {
    q: 'How do AI features work?',
    a: 'Use AI Generate on any lesson page to instantly create supplemental lessons, quizzes, or activities. The AI uses your subject and grade level to tailor the content.',
  },
]

function HowToContent() {
  useAppHeader({ title: '💡 How To', backHref: '/dashboard' })
  const router = useRouter()
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  return (
    <div style={{ minHeight: 'calc(100vh - 56px)', background: '#f8fafc', padding: '32px 24px' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>

        <h1 style={{ fontSize: 28, fontWeight: 800, color: '#111827', marginBottom: 8 }}>
          Help & How To
        </h1>
        <p style={{ fontSize: 14, color: '#6b7280', marginBottom: 32 }}>
          Everything you need to get the most out of HomeschoolReady.
        </p>

        {/* 4 panels */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 20, marginBottom: 32 }}>

          {/* Getting Started */}
          <div style={{ background: '#eff6ff', border: '1.5px solid #bfdbfe', borderRadius: 14, padding: '20px 22px' }}>
            <h2 style={{ fontSize: 16, fontWeight: 800, color: '#1e40af', marginBottom: 14 }}>
              🎯 Getting Started
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <p style={{ fontSize: 13, color: '#1e3a8a' }}>
                <strong>Step 1:</strong> Add your children using the + button
              </p>
              <p style={{ fontSize: 13, color: '#1e3a8a' }}>
                <strong>Step 2:</strong> Import curriculum or create lessons
              </p>
              <p style={{ fontSize: 13, color: '#1e3a8a' }}>
                <strong>Step 3:</strong> Use the calendar to track progress
              </p>
            </div>
          </div>

          {/* Power Features */}
          <div style={{ background: '#faf5ff', border: '1.5px solid #e9d5ff', borderRadius: 14, padding: '20px 22px' }}>
            <h2 style={{ fontSize: 16, fontWeight: 800, color: '#7c3aed', marginBottom: 14 }}>
              ✨ Power Features
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <p style={{ fontSize: 13, color: '#4c1d95' }}>
                <strong>Auto-Schedule:</strong> Bulk assign dates to lessons
              </p>
              <p style={{ fontSize: 13, color: '#4c1d95' }}>
                <strong>AI Generate:</strong> Create supplemental lessons instantly
              </p>
              <p style={{ fontSize: 13, color: '#4c1d95' }}>
                <strong>Import:</strong> Upload curriculum from PDFs
              </p>
            </div>
          </div>

          {/* View Modes */}
          <div style={{ background: '#f0fdf4', border: '1.5px solid #bbf7d0', borderRadius: 14, padding: '20px 22px' }}>
            <h2 style={{ fontSize: 16, fontWeight: 800, color: '#166534', marginBottom: 14 }}>
              📊 View Modes
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <p style={{ fontSize: 13, color: '#14532d' }}>
                <strong>Calendar:</strong> Month view with all children
              </p>
              <p style={{ fontSize: 13, color: '#14532d' }}>
                <strong>Lessons:</strong> Detailed list by child
              </p>
              <p style={{ fontSize: 13, color: '#14532d' }}>
                <strong>Click any day</strong> to view and work through that day's lessons
              </p>
            </div>
          </div>

          {/* FAQ */}
          <div style={{ background: '#fff7ed', border: '1.5px solid #fed7aa', borderRadius: 14, padding: '20px 22px' }}>
            <h2 style={{ fontSize: 16, fontWeight: 800, color: '#c2410c', marginBottom: 14 }}>
              ❓ Frequently Asked
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {FAQS.map((faq, i) => (
                <div key={i}>
                  <button
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      width: '100%', background: 'none', border: 'none', cursor: 'pointer',
                      padding: '6px 0', textAlign: 'left',
                    }}
                  >
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#9a3412' }}>{faq.q}</span>
                    <span style={{ fontSize: 16, color: '#ea580c', marginLeft: 8, flexShrink: 0 }}>
                      {openFaq === i ? '−' : '+'}
                    </span>
                  </button>
                  {openFaq === i && (
                    <p style={{ fontSize: 12, color: '#7c2d12', lineHeight: 1.6, paddingBottom: 8, margin: 0 }}>
                      {faq.a}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Quick links */}
        <div style={{ background: '#fff', border: '1.5px solid #e5e7eb', borderRadius: 14, padding: '20px 24px' }}>
          <h2 style={{ fontSize: 15, fontWeight: 800, color: '#111827', marginBottom: 16 }}>Quick Links</h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            {[
              { label: '📅 Calendar', href: '/calendar' },
              { label: '📖 Lessons', href: '/lessons' },
              { label: '⚙️ Control Center', href: '/admin' },
              { label: '✅ Compliance', href: '/compliance' },
              { label: '📊 Assessments', href: '/admin/assessments' },
              { label: '📄 Transcripts', href: '/transcript' },
              { label: '👩‍🏫 Co-Teachers', href: '/co-teachers' },
            ].map(link => (
              <button
                key={link.href}
                onClick={() => router.push(link.href)}
                style={{
                  padding: '8px 16px', background: '#f3f4f6',
                  border: '1.5px solid #e5e7eb', borderRadius: 100,
                  fontSize: 13, fontWeight: 600, color: '#374151',
                  cursor: 'pointer',
                }}
              >
                {link.label}
              </button>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}

export default function HowToPage() {
  return (
    <AuthGuard>
      <HowToContent />
    </AuthGuard>
  )
}
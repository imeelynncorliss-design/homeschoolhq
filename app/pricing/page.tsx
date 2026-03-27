'use client'

import { useRouter } from 'next/navigation'
import { TIER_DISPLAY, TIER_ORDER, PRICING_COMPARISON_ROWS } from '@/lib/tierTesting'

export default function PricingPage() {
  const router = useRouter()

  return (
    <div style={{ minHeight: '100vh', background: '#3d3a52', fontFamily: "'Nunito', sans-serif", padding: '32px 20px 80px' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>

        {/* Back button */}
        <div style={{ marginBottom: 24 }}>
          <button
            onClick={() => router.back()}
            style={{
              background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: 12, padding: '9px 18px', color: 'rgba(255,255,255,0.85)',
              fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: "'Nunito', sans-serif",
              display: 'inline-flex', alignItems: 'center', gap: 6,
            }}
          >
            ← Back
          </button>
        </div>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>✨</div>
          <h1 style={{ fontSize: 36, fontWeight: 900, color: '#fff', margin: '0 0 8px' }}>Choose Your Plan</h1>
          <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.7)', margin: '0 0 4px' }}>Start free, upgrade anytime</p>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', margin: 0 }}>
            Plans at $5, $7.50, and $10/month — each step adds AI power and compliance depth
          </p>
        </div>

        {/* Pricing Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 32 }}>
          {TIER_ORDER.map((tierKey) => {
            const tier = TIER_DISPLAY[tierKey]
            const isPopular = tier.popular
            return (
              <div
                key={tierKey}
                style={{
                  position: 'relative',
                  background: '#fff',
                  borderRadius: 20,
                  overflow: 'hidden',
                  boxShadow: isPopular
                    ? '0 8px 32px rgba(124,58,237,0.35)'
                    : '0 4px 16px rgba(0,0,0,0.15)',
                  border: isPopular ? '2px solid #7c3aed' : '2px solid transparent',
                }}
              >
                {tier.badge && (
                  <div style={{
                    position: 'absolute', top: 0, right: 0,
                    background: 'linear-gradient(135deg, #7c3aed, #a855f7)',
                    color: '#fff', fontSize: 10, fontWeight: 900,
                    padding: '4px 12px', borderBottomLeftRadius: 10,
                  }}>
                    {tier.badge}
                  </div>
                )}

                <div style={{ padding: '24px 20px' }}>
                  <h2 style={{ fontSize: 20, fontWeight: 900, color: '#1a1a2e', margin: '0 0 12px' }}>{tier.name}</h2>

                  <div style={{ marginBottom: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                      <span style={{ fontSize: 40, fontWeight: 900, color: '#1a1a2e' }}>{tier.price}</span>
                      {tier.priceYearly !== '$0' && (
                        <span style={{ fontSize: 15, color: '#6b7280' }}>/year</span>
                      )}
                    </div>
                    {tier.monthlyEquiv && (
                      <p style={{ fontSize: 12, color: '#9ca3af', margin: '2px 0 0' }}>
                        Billed annually · {tier.monthlyEquiv}
                      </p>
                    )}
                  </div>

                  <p style={{ fontSize: 12, color: '#6b7280', margin: '0 0 16px', lineHeight: 1.5 }}>{tier.description}</p>

                  <button
                    onClick={() => router.push('/dashboard')}
                    style={{
                      width: '100%', padding: '11px 0', borderRadius: 12,
                      border: 'none', cursor: 'pointer', fontWeight: 800,
                      fontSize: 13, color: '#fff', fontFamily: "'Nunito', sans-serif",
                      background: isPopular
                        ? 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #a855f7 100%)'
                        : '#4b5563',
                      boxShadow: isPopular ? '0 4px 14px rgba(124,58,237,0.4)' : 'none',
                    }}
                  >
                    {tier.ctaText}
                  </button>

                  <ul style={{ marginTop: 20, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {tier.features.map((feature, idx) => (
                      <li key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 12 }}>
                        <span style={{ color: '#7c3aed', fontWeight: 900, fontSize: 14, lineHeight: 1.2, flexShrink: 0 }}>✓</span>
                        <span style={{ color: '#374151' }}>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )
          })}
        </div>

        {/* Feature Comparison Table */}
        <div style={{ background: '#fff', borderRadius: 20, boxShadow: '0 4px 16px rgba(0,0,0,0.15)', padding: '28px 24px', marginBottom: 24 }}>
          <h3 style={{ fontSize: 20, fontWeight: 900, color: '#1a1a2e', textAlign: 'center', margin: '0 0 20px' }}>Feature Comparison</h3>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                  <th style={{ textAlign: 'left', padding: '12px 14px', fontWeight: 800, color: '#1a1a2e' }}>Feature</th>
                  {TIER_ORDER.map((tierKey, colIdx) => {
                    const tier = TIER_DISPLAY[tierKey]
                    return (
                      <th
                        key={tierKey}
                        style={{
                          textAlign: 'center', padding: '12px 14px', fontWeight: 800,
                          color: colIdx === 2 ? '#7c3aed' : '#374151',
                          background: colIdx === 2 ? '#f5f3ff' : 'transparent',
                        }}
                      >
                        {tier.name}
                        {tier.priceYearly !== '$0' && (
                          <span style={{ display: 'block', fontWeight: 500, fontSize: 11, color: '#9ca3af' }}>
                            {tier.priceYearly}
                          </span>
                        )}
                      </th>
                    )
                  })}
                </tr>
              </thead>
              <tbody>
                {PRICING_COMPARISON_ROWS.map((row, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '10px 14px', color: '#374151', fontWeight: 600 }}>{row.name}</td>
                    {row.values.map((value, colIdx) => (
                      <td
                        key={colIdx}
                        style={{
                          padding: '10px 14px', textAlign: 'center',
                          background: colIdx === 2 ? '#faf5ff' : 'transparent',
                        }}
                      >
                        {value === '✓' ? (
                          <span style={{ color: '#7c3aed', fontWeight: 900, fontSize: 15 }}>✓</span>
                        ) : value === '–' ? (
                          <span style={{ color: '#d1d5db' }}>–</span>
                        ) : (
                          <span style={{ fontWeight: 700, color: '#374151' }}>{value}</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* FAQ */}
        <div style={{ background: '#fff', borderRadius: 20, boxShadow: '0 4px 16px rgba(0,0,0,0.15)', padding: '28px 24px' }}>
          <h3 style={{ fontSize: 20, fontWeight: 900, color: '#1a1a2e', textAlign: 'center', margin: '0 0 20px' }}>
            Frequently Asked Questions
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 0, maxWidth: 700, margin: '0 auto' }}>
            {[
              {
                q: 'Do I need a credit card to get started?',
                a: 'No. The Free plan is free forever — no credit card required. You only need payment information when you choose to upgrade.',
              },
              {
                q: 'Can I switch plans anytime?',
                a: 'Yes. Upgrades take effect immediately. Downgrades take effect at the end of your current billing period and your data is never deleted.',
              },
              {
                q: 'How does HomeschoolReady compare to other planners?',
                a: 'Homeschool Planet charges $84.95/year for a single tier with no AI generation. HomeschoolReady Essential is just $60/year, and Pro at $90/year adds unlimited AI lesson generation, state compliance automation, and co-teacher collaboration — features no competitor currently offers.',
              },
              {
                q: 'What states are supported for compliance tracking?',
                a: 'All 50 states are supported. We have detailed state-specific requirements pre-loaded so you know exactly what you need to track.',
              },
              {
                q: 'What is Scout?',
                a: "Scout is HomeschoolReady's AI assistant, available from every page in the app. On Free and Essential plans it answers general questions. On Pro and Premium it can generate full lessons and activities, personalized to your teaching style and your children's grade levels.",
              },
            ].map((faq, i, arr) => (
              <div
                key={i}
                style={{ padding: '16px 0', borderBottom: i < arr.length - 1 ? '1px solid #f3f4f6' : 'none' }}
              >
                <h4 style={{ fontWeight: 800, color: '#1a1a2e', margin: '0 0 6px', fontSize: 14 }}>{faq.q}</h4>
                <p style={{ fontSize: 13, color: '#6b7280', margin: 0, lineHeight: 1.6 }}>{faq.a}</p>
              </div>
            ))}
          </div>
        </div>


      </div>
    </div>
  )
}

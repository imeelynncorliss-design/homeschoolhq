'use client'

import { useRouter } from 'next/navigation'

export default function PricingPage() {
  const router = useRouter()

  const tiers = [
    {
      name: 'Free',
      price: '$0',
      period: '',
      description: 'Try out HomeschoolHQ',
      features: [
        '1 student',
        'Manual lesson planning',
        'Basic calendar view',
        'Basic compliance tracking'
      ],
      cta: 'Get Started Free',
      ctaColor: 'bg-gray-600 hover:bg-gray-700',
      popular: false
    },
    {
      name: 'Essential',
      price: '$60',
      period: '/year',
      monthlyEquiv: '$5/mo',
      description: 'Core features for homeschoolers',
      features: [
        'Unlimited students',
        'Curriculum import (PDF)',
        'Full compliance tracking',
        'Basic reporting',
        'Progress tracking'
      ],
      cta: 'Upgrade to Essential',
      ctaColor: 'bg-blue-600 hover:bg-blue-700',
      popular: false
    },
    {
      name: 'Pro',
      price: '$99',
      period: '/year',
      monthlyEquiv: '$8.25/mo',
      description: 'For busy working parents',
      features: [
        'Everything in Essential',
        '✨ AI lesson generation',
        '📅 Work calendar integration',
        'Advanced compliance reports',
        'Automated attendance tracking',
        'Advanced dashboards'
      ],
      cta: 'Upgrade to Pro',
      ctaColor: 'bg-purple-600 hover:bg-purple-700',
      badge: 'Best for Working Parents',
      popular: true
    },
    {
      name: 'Premium',
      price: '$149',
      period: '/year',
      monthlyEquiv: '$12.42/mo',
      description: 'Complete homeschool solution',
      features: [
        'Everything in Pro',
        '🤝 Social Hub access',
        'Co-op class management',
        'Family collaboration',
        'Community events',
        'Multi-family coordination'
      ],
      cta: 'Upgrade to Premium',
      ctaColor: 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700',
      popular: false
    }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-black text-gray-900 mb-4">
            Choose Your Plan
          </h1>
          <p className="text-xl text-gray-600 mb-2">
            Start free, upgrade anytime
          </p>
          <p className="text-sm text-gray-500">
            All paid plans include 14-day money-back guarantee
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid lg:grid-cols-4 md:grid-cols-2 gap-6 mb-12">
          {tiers.map((tier, index) => (
            <div
              key={tier.name}
              className={`relative bg-white rounded-2xl shadow-lg overflow-hidden transition-transform hover:scale-105 ${
                tier.popular ? 'ring-4 ring-purple-500 ring-offset-2' : ''
              }`}
            >
              {/* Popular Badge */}
              {tier.badge && (
                <div className="absolute top-0 right-0 bg-purple-600 text-white text-xs font-bold px-4 py-1 rounded-bl-lg">
                  {tier.badge}
                </div>
              )}

              <div className="p-6">
                {/* Tier Name */}
                <h2 className="text-2xl font-black text-gray-900 mb-2">
                  {tier.name}
                </h2>

                {/* Price */}
                <div className="mb-4">
                  <div className="flex items-baseline gap-1">
                    <span className="text-5xl font-black text-gray-900">
                      {tier.price}
                    </span>
                    {tier.period && (
                      <span className="text-lg text-gray-600">
                        {tier.period}
                      </span>
                    )}
                  </div>
                  {tier.monthlyEquiv && (
                    <p className="text-sm text-gray-500 mt-1">
                      Billed annually • {tier.monthlyEquiv}
                    </p>
                  )}
                </div>

                {/* Description */}
                <p className="text-sm text-gray-600 mb-6">
                  {tier.description}
                </p>

                {/* CTA Button */}
                <button
                  onClick={() => router.push('/dashboard')}
                  className={`w-full py-3 rounded-xl text-white font-bold transition-all shadow-md ${tier.ctaColor}`}
                >
                  {tier.cta}
                </button>

                {/* Features List */}
                <ul className="mt-6 space-y-3">
                  {tier.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm">
                      <span className="text-green-600 font-bold text-lg leading-none mt-0.5">
                        ✓
                      </span>
                      <span className="text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>

        {/* Feature Comparison Table */}
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <h3 className="text-2xl font-black text-gray-900 mb-6 text-center">
            Feature Comparison
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-gray-200">
                  <th className="text-left py-4 px-4 font-bold text-gray-900">
                    Feature
                  </th>
                  <th className="text-center py-4 px-4 font-bold text-gray-900">
                    Free
                  </th>
                  <th className="text-center py-4 px-4 font-bold text-gray-900">
                    Essential
                  </th>
                  <th className="text-center py-4 px-4 font-bold text-purple-900 bg-purple-50">
                    Pro
                  </th>
                  <th className="text-center py-4 px-4 font-bold text-gray-900">
                    Premium
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {[
                  { name: 'Students', values: ['1', '♾️', '♾️', '♾️'] },
                  { name: 'Manual Lessons', values: ['✓', '✓', '✓', '✓'] },
                  { name: 'Basic Calendar', values: ['✓', '✓', '✓', '✓'] },
                  { name: 'Basic Compliance', values: ['✓', '–', '–', '–'] },
                  { name: 'Curriculum Import', values: ['–', '✓', '✓', '✓'] },
                  { name: 'Full Compliance Tracking', values: ['–', '✓', '✓', '✓'] },
                  { name: 'Basic Reporting', values: ['–', '✓', '✓', '✓'] },
                  { name: 'AI Lesson Generation', values: ['–', '–', '✓', '✓'] },
                  { name: 'Work Calendar Integration', values: ['–', '–', '✓', '✓'] },
                  { name: 'Advanced Compliance Reports', values: ['–', '–', '✓', '✓'] },
                  { name: 'Automated Attendance', values: ['–', '–', '✓', '✓'] },
                  { name: 'Social Hub', values: ['–', '–', '–', '✓'] },
                  { name: 'Co-op Management', values: ['–', '–', '–', '✓'] },
                  { name: 'Family Collaboration', values: ['–', '–', '–', '✓'] }
                ].map((row, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="py-3 px-4 text-gray-900">{row.name}</td>
                    {row.values.map((value, colIdx) => (
                      <td
                        key={colIdx}
                        className={`py-3 px-4 text-center ${
                          colIdx === 2 ? 'bg-purple-50' : ''
                        }`}
                      >
                        {value === '✓' ? (
                          <span className="text-green-600 font-bold text-lg">
                            ✓
                          </span>
                        ) : value === '–' ? (
                          <span className="text-gray-300">–</span>
                        ) : (
                          <span className="font-semibold text-gray-900">
                            {value}
                          </span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="mt-12 bg-white rounded-2xl shadow-lg p-8">
          <h3 className="text-2xl font-black text-gray-900 mb-6 text-center">
            Frequently Asked Questions
          </h3>

          <div className="space-y-4 max-w-3xl mx-auto">
            <div className="border-b border-gray-200 pb-4">
              <h4 className="font-bold text-gray-900 mb-2">
                Can I switch plans anytime?
              </h4>
              <p className="text-sm text-gray-600">
                Yes! You can upgrade or downgrade at any time. Upgrades take
                effect immediately, and downgrades take effect at the end of
                your billing period.
              </p>
            </div>

            <div className="border-b border-gray-200 pb-4">
              <h4 className="font-bold text-gray-900 mb-2">
                What if I need compliance tracking but can't afford Pro?
              </h4>
              <p className="text-sm text-gray-600">
                Essential tier ($60/yr) includes full compliance tracking for
                all your students! Pro tier adds work calendar integration and
                AI features for busy working parents.
              </p>
            </div>

            <div className="border-b border-gray-200 pb-4">
              <h4 className="font-bold text-gray-900 mb-2">
                Is there a money-back guarantee?
              </h4>
              <p className="text-sm text-gray-600">
                Yes! All paid plans include a 14-day money-back guarantee. If
                you're not satisfied, we'll refund your payment, no questions
                asked.
              </p>
            </div>

            <div>
              <h4 className="font-bold text-gray-900 mb-2">
                Can I try Pro features before committing?
              </h4>
              <p className="text-sm text-gray-600">
                Absolutely! Start with Free or Essential, and we offer a free
                14-day trial when you upgrade to Pro or Premium.
              </p>
            </div>
          </div>
        </div>

        {/* Back to Dashboard */}
        <div className="text-center mt-12">
          <button
            onClick={() => router.push('/dashboard')}
            className="text-blue-600 hover:text-blue-700 font-semibold underline"
          >
            ← Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  )
}
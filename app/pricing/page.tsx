'use client'

import { useRouter } from 'next/navigation'
import { TIER_DISPLAY, TIER_ORDER, PRICING_COMPARISON_ROWS } from '@/lib/tierTesting'

export default function PricingPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-8">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-black text-gray-900 mb-4">Choose Your Plan</h1>
          <p className="text-xl text-gray-600 mb-2">Start free, upgrade anytime</p>
          <p className="text-sm text-gray-500">
            Plans at $5, $7.50, and $10/month — each step unlocks more power for your homeschool
          </p>
        </div>

        {/* Pricing Cards — driven by TIER_DISPLAY in tierTesting.ts */}
        <div className="grid lg:grid-cols-4 md:grid-cols-2 gap-6 mb-12">
          {TIER_ORDER.map((tierKey) => {
            const tier = TIER_DISPLAY[tierKey]
            return (
              <div
                key={tierKey}
                className={`relative bg-white rounded-2xl shadow-lg overflow-hidden transition-transform hover:scale-105 ${
                  tier.popular ? 'ring-4 ring-purple-500 ring-offset-2' : ''
                }`}
              >
                {tier.badge && (
                  <div className="absolute top-0 right-0 bg-purple-600 text-white text-xs font-bold px-4 py-1 rounded-bl-lg">
                    {tier.badge}
                  </div>
                )}

                <div className="p-6">
                  <h2 className="text-2xl font-black text-gray-900 mb-2">{tier.name}</h2>

                  <div className="mb-4">
                    <div className="flex items-baseline gap-1">
                      <span className="text-5xl font-black text-gray-900">{tier.price}</span>
                      {tier.priceYearly !== '$0' && (
                        <span className="text-lg text-gray-600">/year</span>
                      )}
                    </div>
                    {tier.monthlyEquiv && (
                      <p className="text-sm text-gray-500 mt-1">
                        Billed annually • {tier.monthlyEquiv}
                      </p>
                    )}
                  </div>

                  <p className="text-sm text-gray-600 mb-6">{tier.description}</p>

                  <button
                    onClick={() => router.push('/dashboard')}
                    className={`w-full py-3 rounded-xl text-white font-bold transition-all shadow-md ${tier.ctaColor}`}
                  >
                    {tier.ctaText}
                  </button>

                  <ul className="mt-6 space-y-3">
                    {tier.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm">
                        <span className="text-green-600 font-bold text-lg leading-none mt-0.5">✓</span>
                        <span className="text-gray-700">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )
          })}
        </div>

        {/* Feature Comparison Table — driven by PRICING_COMPARISON_ROWS in tierTesting.ts */}
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <h3 className="text-2xl font-black text-gray-900 mb-6 text-center">Feature Comparison</h3>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-gray-200">
                  <th className="text-left py-4 px-4 font-bold text-gray-900">Feature</th>
                  {TIER_ORDER.map((tierKey, colIdx) => {
                    const tier = TIER_DISPLAY[tierKey]
                    return (
                      <th
                        key={tierKey}
                        className={`text-center py-4 px-4 font-bold ${
                          colIdx === 2 ? 'text-purple-900 bg-purple-50' : 'text-gray-700'
                        }`}
                      >
                        {tier.name}
                        {tier.priceYearly !== '$0' && (
                          <span className="block font-normal text-xs text-gray-500">
                            {tier.priceYearly}
                          </span>
                        )}
                      </th>
                    )
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {PRICING_COMPARISON_ROWS.map((row, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="py-3 px-4 text-gray-900">{row.name}</td>
                    {row.values.map((value, colIdx) => (
                      <td
                        key={colIdx}
                        className={`py-3 px-4 text-center ${colIdx === 2 ? 'bg-purple-50' : ''}`}
                      >
                        {value === '✓' ? (
                          <span className="text-green-600 font-bold text-lg">✓</span>
                        ) : value === '–' ? (
                          <span className="text-gray-300">–</span>
                        ) : (
                          <span className="font-semibold text-gray-900">{value}</span>
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
        <div className="mt-12 bg-white rounded-2xl shadow-lg p-8">
          <h3 className="text-2xl font-black text-gray-900 mb-6 text-center">
            Frequently Asked Questions
          </h3>

          <div className="space-y-4 max-w-3xl mx-auto">
            <div className="border-b border-gray-200 pb-4">
              <h4 className="font-bold text-gray-900 mb-2">Can I switch plans anytime?</h4>
              <p className="text-sm text-gray-600">
                Yes! Upgrades take effect immediately, and downgrades take effect at the end of your billing period.
              </p>
            </div>

            <div className="border-b border-gray-200 pb-4">
              <h4 className="font-bold text-gray-900 mb-2">How does pricing compare to other homeschool planners?</h4>
              <p className="text-sm text-gray-600">
                Homeschool Planet charges $84.95/year for a single tier. HomeschoolReady's Essential
                tier is just $60/year, and our Pro tier ($90/year) adds AI lesson generation,
                co-teacher collaboration, and state compliance automation that no competitor offers.
              </p>
            </div>

            <div className="border-b border-gray-200 pb-4">
              <h4 className="font-bold text-gray-900 mb-2">Is there a money-back guarantee?</h4>
              <p className="text-sm text-gray-600">
                Yes! All paid plans include a 14-day money-back guarantee, no questions asked.
              </p>
            </div>

            <div>
              <h4 className="font-bold text-gray-900 mb-2">Can I try Pro features before committing?</h4>
              <p className="text-sm text-gray-600">
                Absolutely! We offer a free 14-day trial when you upgrade to Pro or Premium.
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
'use client'

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-center mb-4 text-gray-900">Pricing Plans</h1>
        <p className="text-center text-gray-900 mb-12 text-lg">Coming Soon!</p>
        
        <div className="grid md:grid-cols-3 gap-6">
          {/* FREE */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-2xl font-bold mb-2 text-gray-900">FREE</h2>
            <div className="text-4xl font-bold mb-4 text-gray-900">$0</div>
            <ul className="space-y-2 text-sm text-gray-900">
              <li>✓ 1 child</li>
              <li>✓ Manual lesson planning</li>
              <li>✓ Basic calendar</li>
            </ul>
          </div>
          
          {/* PREMIUM */}
          <div className="bg-blue-50 rounded-lg shadow-lg p-6 border-2 border-blue-500">
            <div className="text-xs text-blue-600 font-bold mb-2">BEST VALUE</div>
            <h2 className="text-2xl font-bold mb-2 text-gray-900">PREMIUM</h2>
            <div className="text-4xl font-bold mb-4 text-gray-900">
              $12.99<span className="text-lg text-gray-900">/mo</span>
            </div>
            <ul className="space-y-2 text-sm text-gray-900">
              <li>✓ Unlimited children</li>
              <li>✓ AI lesson generation</li>
              <li>✓ Curriculum import</li>
              <li>✓ Progress tracking</li>
              <li>✓ Admin features</li>
            </ul>
          </div>
          
          {/* FAMILY */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-2xl font-bold mb-2 text-gray-900">FAMILY</h2>
            <div className="text-4xl font-bold mb-4 text-gray-900">
              $19.99<span className="text-lg text-gray-900">/mo</span>
            </div>
            <ul className="space-y-2 text-sm text-gray-900">
              <li>✓ Everything in Premium</li>
              <li>✓ Social calendar</li>
              <li>✓ Co-op management</li>
              <li>✓ Community connect</li>
              <li>✓ Family collaboration</li>
            </ul>
          </div>
        </div>
        
        <div className="text-center mt-8">
          <a href="/dashboard" className="text-blue-600 hover:underline font-semibold">
            ← Back to Dashboard
          </a>
        </div>
      </div>
    </div>
  )
}
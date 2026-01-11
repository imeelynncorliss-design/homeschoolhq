'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'

const AVAILABLE_STATES = [
  { code: 'CA', name: 'California', available: true, count: 4 },
  { code: 'VT', name: 'Vermont', available: true, count: 4 },
  { code: 'MA', name: 'Massachusetts', available: true, count: 4 },
  { code: 'TX', name: 'Texas', available: false, comingSoon: true, count: 0 },
  { code: 'VA', name: 'Virginia', available: false, comingSoon: true, count: 0 },
  { code: 'NC', name: 'North Carolina', available: false, comingSoon: true, count: 0 },
]

export default function StandardsOnboarding() {
  const [selectedState, setSelectedState] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false) 
  const router = useRouter()

  async function handleImportTemplate() {
    if (!selectedState) return
    
    setLoading(true)
    setError('')
    
    try {
      // Get the access token from Supabase client
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )
      
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        setError('You must be logged in to import standards')
        setLoading(false)
        return
      }
      
      const response = await fetch('/api/standards/clone-template', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ stateCode: selectedState })
      })
      
      const result = await response.json() as { 
        success?: boolean
        count?: number
        stateCode?: string
        error?: string
      }
      
      if (response.ok && result.success) {
        setSuccess(true)
      } else {
        setError(result.error || 'Failed to import standards')
      }
    } catch (err) {
      setError('Failed to import standards. Please try again.')
      console.error('Import error:', err)
    } finally {
      setLoading(false)
    }
  }

  function handleSkip() {
    router.push('/dashboard')
  }

  const selectedStateInfo = AVAILABLE_STATES.find(s => s.code === selectedState)

  // SUCCESS SCREEN - Show this when import is successful
  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full text-center">
          <div className="bg-white p-8 rounded-lg shadow">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Standards Imported Successfully!
            </h2>
            <p className="text-gray-600 mb-6">
              Imported {selectedStateInfo?.name} standards to your account.
              You can now use these to track and align your lessons.
            </p>
            <button
              onClick={() => router.push('/dashboard?standards-imported=true')}
              className="w-full py-3 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Continue to Dashboard
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-lg shadow">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">
            Import State Standards
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Choose your state to import educational standards for tracking and alignment.
          </p>
        </div>

        {/* Disclaimer */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">
                Important Notice
              </h3>
              <div className="mt-2 text-sm text-yellow-700">
                <p>
                  Standards are imported as a starting point for your use. 
                  Please verify accuracy with your state's official Department of Education website.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* State Selection */}
        <div>
          <label htmlFor="state" className="block text-sm font-medium text-gray-700">
            Select Your State
          </label>
          <select
              id="state"
              value={selectedState}
              onChange={(e) => {
                setSelectedState(e.target.value)
                setError('')
              }}
              className="block w-full pl-3 pr-10 py-3 text-base border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 rounded-md text-gray-900"
            >
              <option value="" className="text-gray-500">Choose a state...</option>
              {AVAILABLE_STATES.map(state => (
                <option 
                  key={state.code} 
                  value={state.code}
                  disabled={!state.available}
                  className="text-gray-900"
                >
                  {state.name} {state.comingSoon ? '(Coming Soon)' : state.available ? `(~${state.count} sample standards)` : ''}
                </option>
              ))}
            </select>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {/* Buttons */}
        <div className="space-y-3">
          <button
            onClick={handleImportTemplate}
            disabled={!selectedState || loading}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Importing...' : 'Import Standards'}
          </button>

          <button
            onClick={handleSkip}
            disabled={loading}
            className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Skip for Now
          </button>
        </div>

        <div className="text-xs text-gray-500 text-center">
          You can import standards later from your settings
        </div>
      </div>
    </div>
  )
}

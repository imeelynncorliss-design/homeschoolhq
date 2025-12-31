'use client'

import { useState, useEffect } from 'react'
import Joyride, { CallBackProps, STATUS, Step } from 'react-joyride'

interface OnboardingTourProps {
  run: boolean
  onComplete: () => void
}

export default function OnboardingTour({ run, onComplete }: OnboardingTourProps) {
  const [stepIndex, setStepIndex] = useState(0)

  const steps: Step[] = [
    {
      target: 'body',
      content: (
        <div>
          <h2 className="text-xl font-bold mb-2">Welcome to HomeschoolHQ! 🎉</h2>
          <p>Let's take a quick tour to help you get started. This will only take a minute!</p>
        </div>
      ),
      placement: 'center',
      disableBeacon: true,
    },
    {
      target: '.kids-section',
      content: (
        <div>
          <h3 className="font-bold mb-2">Step 1: Add Your Children</h3>
          <p>Start by adding your children here. Click "+ Add a Child" to get started.</p>
        </div>
      ),
      placement: 'right',
      disableBeacon: true,
    },
    {
      target: 'body',
      content: (
        <div>
          <h2 className="text-xl font-bold mb-2">What's Next?</h2>
          <p><strong>After adding a child:</strong></p>
          <ul className="list-disc ml-5 mt-2 space-y-1">
            <li>Click their name to select them</li>
            <li>Use <strong>Add Lesson</strong> to create individual lessons</li>
            <li>Use <strong>Lesson Generator</strong> to create AI-powered lessons</li>
            <li>Use <strong>Import Curriculum</strong> to upload existing plans</li>
            <li>Track hours automatically as you add lessons!</li>
          </ul>
        </div>
      ),
      placement: 'center',
      disableBeacon: true,
    },
    {
      target: 'body',
      content: (
        <div>
          <h2 className="text-xl font-bold mb-2">You're All Set! 🚀</h2>
          <p>Start by adding your first child, then create some lessons. You can replay this tour anytime from the "👋 Take Tour" button.</p>
        </div>
      ),
      placement: 'center',
      disableBeacon: true,
    },
  ]

  const handleJoyrideCallback = (data: CallBackProps) => {
    const { status, index, action } = data

    if ([STATUS.FINISHED, STATUS.SKIPPED].includes(status)) {
      onComplete()
      setStepIndex(0)
    }

    if (action === 'next' || action === 'prev') {
      setStepIndex(index + (action === 'next' ? 1 : -1))
    }
  }

  return (
    <Joyride
      steps={steps}
      run={run}
      continuous
      showProgress
      showSkipButton
      stepIndex={stepIndex}
      callback={handleJoyrideCallback}
      styles={{
        options: {
          primaryColor: '#2563eb',
          zIndex: 10000,
        },
        buttonNext: {
          backgroundColor: '#2563eb',
          fontSize: 14,
          padding: '8px 16px',
        },
        buttonBack: {
          color: '#6b7280',
          fontSize: 14,
        },
        buttonSkip: {
          color: '#6b7280',
          fontSize: 14,
        },
      }}
      locale={{
        back: 'Back',
        close: 'Close',
        last: 'Get Started!',
        next: 'Next',
        skip: 'Skip Tour',
      }}
    />
  )
}
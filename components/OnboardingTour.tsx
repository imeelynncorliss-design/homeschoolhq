'use client'

import { useState } from 'react'
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
      spotlightClicks: false,
      disableOverlayClose: true,
    },
    {
      target: 'body',
      content: (
        <div>
          <h1 className="text-xl font-bold mb-2">Where Do I start?</h1>

          <h2 className="text-xl font-bold mb-2">Core Info</h2>

          <ul className="list-disc ml-5 mt-2 space-y-1">
            <li>Click the <strong>"Add a Child"</strong> button </li>
            <li>Upload their picture</li>
            <li>Add their <strong>First Name (required) </strong> and <strong> Last Name </strong></li>
            <li>Then add their <strong>Display Name, Age, and Grade Level</strong></li>
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
          <h2 className="text-xl font-bold mb-2">How They Learn</h2>
         
          <ul className="list-disc ml-5 mt-2 space-y-1">

            <li>Enter your child's <strong>Learning Style, Pace of Learning and Environmental Needs</strong> </li>
            <li>If you don't know what your child's learning style is, take the learning style assessment</li>
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
          <h2 className="text-xl font-bold mb-2">Subject Pacing</h2>
          
          <ul className="list-disc ml-5 mt-2 space-y-1">

            Track how your student learns in each subject
            <li>Click <strong>"Add a Subject"</strong></li>
            <li>Select the subject from the dropdown</li>
            <li>Click <strong>"Add Subject"</strong></li>
            <li>Click the dropdown for the subject you selected and determine your child's learning pace for that subject</li>
            <li>Click <strong>"Add a Subject"</strong> to add additional subjects</li>
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
          <h2 className="text-xl font-bold mb-2">Current Focus</h2>
          
          <ul className="list-disc ml-5 mt-2 space-y-1">

            Enter infomation for
            <li><strong>The "Hook": What are they loving right now? 🌟</strong></li>
            <li><strong>Today's Vibe 😊</strong></li>
            <li><strong>Current Academic Focus</strong></li>
            <li>Click <strong> Save Changes</strong></li>
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
          <p> Follow the previous steps to add additional children. You can replay this tour anytime from the "👋 Take Tour" button.</p>
        </div>
      ),
      placement: 'center',
      disableBeacon: true,
    },
  ]

  const handleJoyrideCallback = (data: CallBackProps) => {
    const { status, index, action } = data
  
    if (status === STATUS.FINISHED || status === STATUS.SKIPPED || action === 'close') {
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
      showProgress={false}
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
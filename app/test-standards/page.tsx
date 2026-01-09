'use client';
import { useState } from 'react';
import { StandardsPicker } from '@/components/StandardsPicker';
import {
  ProficiencyBadge,
  CoverageDashboard,
} from '@/components/ProficiencyComponents';

export default function TestStandardsPage() {
  const [open, setOpen] = useState(false);
  
  return (
    <div className="p-8 space-y-8">
      <h1 className="text-2xl font-bold mb-4">Test Standards Components</h1>
      
      {/* Test StandardsPicker */}
      <section>
        <h2 className="text-xl font-semibold mb-3">Standards Picker</h2>
        <button 
          onClick={() => setOpen(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Open Standards Picker
        </button>
        
        <StandardsPicker
          isOpen={open}
          onClose={() => setOpen(false)}
          onSelect={(standards) => {
            console.log('Selected:', standards);
            alert(`Selected ${standards.length} standards!`);
            setOpen(false);
          }}
          defaultGradeLevel="3"
          defaultSubject="Mathematics"
        />
      </section>

      {/* Test Proficiency Badges */}
      <section>
        <h2 className="text-xl font-semibold mb-3">Proficiency Badges</h2>
        <div className="flex gap-3 flex-wrap">
          <ProficiencyBadge level="not_started" />
          <ProficiencyBadge level="introduced" />
          <ProficiencyBadge level="developing" />
          <ProficiencyBadge level="proficient" />
          <ProficiencyBadge level="mastered" />
        </div>
      </section>

      {/* Test Coverage Dashboard */}
      <section>
        <h2 className="text-xl font-semibold mb-3">Coverage Dashboard</h2>
        <CoverageDashboard
          totalStandards={50}
          notStarted={5}
          introduced={10}
          developing={15}
          proficient={12}
          mastered={8}
          subject="Mathematics"
          gradeLevel="3"
        />
      </section>
    </div>
  );
}
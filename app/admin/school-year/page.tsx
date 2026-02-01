// components/admin/SchoolYearSetup.tsx
'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js'
import { SchoolYearConfig, SchoolYearTemplate, SCHOOL_YEAR_TEMPLATES, DayOfWeek, SchoolYearType } from '@/src/types/school-year';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

interface SchoolYearSetupProps {
  organizationId: string;
  onComplete?: () => void;
}

export default function SchoolYearSetup({ organizationId, onComplete }: SchoolYearSetupProps) {
  const supabase = createClient(supabaseUrl, supabaseKey);
  const [step, setStep] = useState(1);
  const [selectedTemplate, setSelectedTemplate] = useState<SchoolYearTemplate | null>(null);
  const [loading, setLoading] = useState(false);
  const [existingConfig, setExistingConfig] = useState<SchoolYearConfig | null>(null);

  // Form state
  const [schoolYearType, setSchoolYearType] = useState<SchoolYearType>('traditional');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [weeksOn, setWeeksOn] = useState<number>(9);
  const [weeksOff, setWeeksOff] = useState<number>(3);
  const [cycleStartDate, setCycleStartDate] = useState('');
  const [schoolDays, setSchoolDays] = useState<DayOfWeek[]>([
    'monday', 'tuesday', 'wednesday', 'thursday', 'friday'
  ]);

  useEffect(() => {
    loadExistingConfig();
  }, [organizationId]);

  const loadExistingConfig = async () => {
    const { data, error } = await supabase
      .from('school_year_config')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('active', true)
      .single();

    if (data) {
      setExistingConfig(data);
      setSchoolYearType(data.school_year_type);
      setStartDate(data.school_year_start_date);
      setEndDate(data.school_year_end_date);
      if (data.weeks_on) setWeeksOn(data.weeks_on);
      if (data.weeks_off) setWeeksOff(data.weeks_off);
      if (data.cycle_start_date) setCycleStartDate(data.cycle_start_date);
      setSchoolDays(data.school_days);
    }
  };

  const handleTemplateSelect = (template: SchoolYearTemplate) => {
    setSelectedTemplate(template);
    setSchoolYearType(template.school_year_type);
    
    // Set default dates based on template
    const today = new Date();
    const currentYear = today.getFullYear();
    const startMonth = template.typical_start_month - 1; // JS months are 0-indexed
    const endMonth = template.typical_end_month - 1;
    
    let startYear = currentYear;
    let endYear = currentYear;
    
    // Adjust years if we're past the typical start month
    if (today.getMonth() > startMonth) {
      startYear = currentYear;
      endYear = startMonth <= endMonth ? currentYear : currentYear + 1;
    } else {
      startYear = currentYear;
      endYear = startMonth <= endMonth ? currentYear : currentYear + 1;
    }
    
    const suggestedStart = new Date(startYear, startMonth, 1);
    const suggestedEnd = new Date(endYear, endMonth + 1, 0); // Last day of end month
    
    setStartDate(suggestedStart.toISOString().split('T')[0]);
    setEndDate(suggestedEnd.toISOString().split('T')[0]);
    
    if (template.weeks_on) setWeeksOn(template.weeks_on);
    if (template.weeks_off) setWeeksOff(template.weeks_off);
    if (template.school_year_type === 'year_round') {
      setCycleStartDate(suggestedStart.toISOString().split('T')[0]);
    }
    
    setStep(2);
  };

  const toggleSchoolDay = (day: DayOfWeek) => {
    setSchoolDays(prev =>
      prev.includes(day)
        ? prev.filter(d => d !== day)
        : [...prev, day]
    );
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      // Deactivate existing config if it exists
      if (existingConfig) {
        await supabase
          .from('school_year_config')
          .update({ active: false })
          .eq('id', existingConfig.id);
      }

      const configData = {
        organization_id: organizationId,
        school_year_type: schoolYearType,
        school_year_start_date: startDate,
        school_year_end_date: endDate,
        school_days: schoolDays,
        active: true,
        ...(schoolYearType === 'year_round' && {
          weeks_on: weeksOn,
          weeks_off: weeksOff,
          cycle_start_date: cycleStartDate || startDate,
        }),
      };

      const { data, error } = await supabase
        .from('school_year_config')
        .insert(configData)
        .select()
        .single();

      if (error) throw error;

      // Add default vacations if template selected
      if (selectedTemplate && selectedTemplate.default_vacations.length > 0) {
        const startYear = new Date(startDate).getFullYear();
        const vacations = selectedTemplate.default_vacations.map(v => {
          const vacationDate = new Date(startYear, v.typical_month - 1, 1);
          const vacationEnd = new Date(vacationDate);
          vacationEnd.setDate(vacationEnd.getDate() + v.duration_days - 1);
          
          return {
            organization_id: organizationId,
            school_year_config_id: data.id,
            name: v.name,
            start_date: vacationDate.toISOString().split('T')[0],
            end_date: vacationEnd.toISOString().split('T')[0],
            vacation_type: v.vacation_type,
          };
        });

        await supabase.from('vacation_periods').insert(vacations);
      }

      setStep(3);
      if (onComplete) onComplete();
    } catch (error) {
      console.error('Error saving school year config:', error);
      alert('Failed to save school year configuration. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">School Year Setup</h1>
        <p className="text-gray-600">
          Configure your homeschool schedule to match your family's needs
        </p>
      </div>

      {/* Progress indicator */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  step >= s ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
                }`}
              >
                {s}
              </div>
              {s < 3 && (
                <div
                  className={`w-24 h-1 ${step > s ? 'bg-blue-600' : 'bg-gray-200'}`}
                />
              )}
            </div>
          ))}
        </div>
        <div className="flex justify-between mt-2 text-sm">
          <span>Choose Template</span>
          <span>Customize</span>
          <span>Add Vacations</span>
        </div>
      </div>

      {/* Step 1: Template Selection */}
      {step === 1 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold mb-4">Choose Your School Year Type</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {SCHOOL_YEAR_TEMPLATES.map((template) => (
              <button
                key={template.id}
                onClick={() => handleTemplateSelect(template)}
                className="p-6 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition text-left"
              >
                <h3 className="font-semibold text-lg mb-2">{template.name}</h3>
                <p className="text-gray-600 text-sm">{template.description}</p>
                {template.weeks_on && (
                  <p className="text-sm text-blue-600 mt-2">
                    {template.weeks_on} weeks on, {template.weeks_off} weeks off
                  </p>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 2: Customize Dates and Schedule */}
      {step === 2 && (
        <div className="space-y-6">
          <h2 className="text-xl font-semibold mb-4">Customize Your Schedule</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium mb-2">School Year Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">School Year End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg"
              />
            </div>
          </div>

          {schoolYearType === 'year_round' && (
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="font-semibold mb-4">Year-Round Schedule Configuration</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Weeks On</label>
                  <input
                    type="number"
                    value={weeksOn}
                    onChange={(e) => setWeeksOn(parseInt(e.target.value))}
                    min="1"
                    max="52"
                    className="w-full px-4 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Weeks Off</label>
                  <input
                    type="number"
                    value={weeksOff}
                    onChange={(e) => setWeeksOff(parseInt(e.target.value))}
                    min="1"
                    max="52"
                    className="w-full px-4 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Cycle Start Date</label>
                  <input
                    type="date"
                    value={cycleStartDate}
                    onChange={(e) => setCycleStartDate(e.target.value)}
                    className="w-full px-4 py-2 border rounded-lg"
                  />
                </div>
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-3">School Days</label>
            <div className="flex flex-wrap gap-3">
              {(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as DayOfWeek[]).map((day) => (
                <button
                  key={day}
                  onClick={() => toggleSchoolDay(day)}
                  className={`px-4 py-2 rounded-lg border-2 transition ${
                    schoolDays.includes(day)
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-700 border-gray-300 hover:border-blue-500'
                  }`}
                >
                  {day.charAt(0).toUpperCase() + day.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-4">
            <button
              onClick={() => setStep(1)}
              className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Back
            </button>
            <button
              onClick={() => setStep(3)}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Continue to Vacations
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Vacation Planning */}
      {step === 3 && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Plan Your Breaks & Vacations</h2>
            <button
              onClick={handleSave}
              disabled={loading}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Save & Continue'}
            </button>
          </div>
          
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-sm">
              {selectedTemplate && selectedTemplate.default_vacations.length > 0
                ? `We've pre-filled some common breaks for ${selectedTemplate.name}. You can customize these on the next page.`
                : 'You can add vacation periods on the next page after saving your school year configuration.'}
            </p>
          </div>

          {selectedTemplate && selectedTemplate.default_vacations.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-medium">Default Breaks Included:</h3>
              <ul className="list-disc list-inside space-y-1 text-gray-700">
                {selectedTemplate.default_vacations.map((v, i) => (
                  <li key={i}>
                    {v.name} - {v.duration_days} days
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex gap-4">
            <button
              onClick={() => setStep(2)}
              className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Back
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
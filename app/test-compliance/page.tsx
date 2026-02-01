'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/src/lib/supabase';
import {
  useComplianceSettings,
  useComplianceDashboard,
} from '@/src/hooks/useCompliance';

export default function TestCompliancePage() {
  const supabase = createClient();
  const organizationId = 'd52497c0-42a9-49b7-ba3b-849bffa27fc4'; // Your org ID
  
  const [kids, setKids] = useState<any[]>([]);
  const [selectedKidId, setSelectedKidId] = useState<string>('');
  const [loadingKids, setLoadingKids] = useState(true);

  const {
    settings,
    loading: settingsLoading,
    error: settingsError,
    createSetting,
    updateSetting,
    deleteSetting,
  } = useComplianceSettings(organizationId);

  const {
    setting,
    hours,
    healthScore,
    loading: dashboardLoading,
    error: dashboardError,
  } = useComplianceDashboard(selectedKidId, organizationId);

  // Fetch kids on mount
useEffect(() => {
  async function fetchKids() {
    console.log('Fetching kids for org:', organizationId);
    
    const { data, error } = await supabase
      .from('kids')
      .select('*')
      .eq('organization_id', organizationId)
      .order('firstname', { ascending: true }); // Fixed: explicit ascending parameter

    console.log('Kids query result:', { data, error });

    if (error) {
      console.error('Error fetching kids:', error);
    } else {
      console.log('Successfully fetched kids:', data);
      setKids(data || []);
      if (data && data.length > 0) {
        setSelectedKidId(data[0].id);
      }
    }
    setLoadingKids(false);
  }

  fetchKids();
}, [supabase, organizationId]);

  // Create test compliance setting
  const handleCreateTestSetting = async () => {
    if (!selectedKidId) return;

    const result = await createSetting({
      organization_id: organizationId,
      kid_id: selectedKidId,
      state_code: 'NC',
      state_name: 'North Carolina',
      school_year_start_month: 8,
      school_year_end_month: 5,
      required_annual_hours: 1080,
      required_annual_days: 180,
      required_subjects: [
        { name: 'Mathematics', hours: 120 },
        { name: 'Language Arts', hours: 120 },
        { name: 'Science', hours: 100 },
        { name: 'Social Studies', hours: 100 },
      ],
      assessment_frequency: 'annual',
      track_by_hours: true,
      track_by_days: true,
      track_by_subjects: true,
      alert_threshold_percentage: 80,
      notes: 'Test compliance setting created via test page',
    });

    if (result) {
      alert('Test compliance setting created successfully!');
    }
  };

  // Update test setting
  const handleUpdateSetting = async () => {
    if (!setting) return;

    const success = await updateSetting(setting.id, {
      required_annual_hours: 1200,
      notes: 'Updated via test page at ' + new Date().toLocaleTimeString(),
    });

    if (success) {
      alert('Setting updated successfully!');
    }
  };

  // Delete setting
  const handleDeleteSetting = async () => {
    if (!setting) return;
    if (!confirm('Delete this compliance setting?')) return;

    const success = await deleteSetting(setting.id);
    if (success) {
      alert('Setting deleted successfully!');
    }
  };

  if (loadingKids) {
    return <div className="p-8">Loading kids...</div>;
  }

  if (kids.length === 0) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">Compliance Test Page</h1>
        <p className="text-red-600">No kids found in your organization. Please add a kid first.</p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-6xl mx-auto bg-white min-h-screen text-gray-900">
      <h1 className="text-3xl font-bold mb-6 text-gray-900">Compliance System Test</h1>

      {/* Kid Selector */}
      <div className="mb-8 p-4 border rounded-lg bg-white">
        <label className="block font-semibold mb-2 text-gray-900">Select Kid:</label>
        <select
          value={selectedKidId}
          onChange={(e) => setSelectedKidId(e.target.value)}
          className="p-2 border rounded w-full max-w-md text-gray-900 bg-white"
        >
          {kids.map((kid) => (
            <option key={kid.id} value={kid.id}>
              {kid.firstname} {kid.lastname}
            </option>
          ))}
        </select>
      </div>

      {/* Settings Loading/Error */}
      {settingsLoading && <div className="mb-4">Loading settings...</div>}
      {settingsError && (
        <div className="mb-4 p-4 bg-red-50 text-red-700 rounded">
          Error: {settingsError}
        </div>
      )}

      {/* Current Settings */}
      <div className="mb-8 p-6 border rounded-lg">
        <h2 className="text-2xl font-bold mb-4 text-gray-800">Compliance Settings</h2>
        
        {setting ? (
          <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-grey-900">
                <div>
                  <p className="font-semibold">State:</p>
                  <p>{setting.state_name} ({setting.state_code})</p>
                </div>
                <div>
                  <p className="font-semibold">School Year:</p>
                  <p>
                    Start: {new Date(2024, setting.school_year_start_month - 1).toLocaleString('en-US', { month: 'long' })}, 
                    End: {new Date(2024, setting.school_year_end_month - 1).toLocaleString('en-US', { month: 'long' })}
                  </p>
                </div>
                <div>
                  <p className="font-semibold">Required Hours:</p>
                  <p>{setting.required_annual_hours || 'N/A'}</p>
                </div>
                <div>
                  <p className="font-semibold">Required Days:</p>
                  <p>{setting.required_annual_days || 'N/A'}</p>
                </div>
              </div>

            <div>
              <p className="font-semibold">Notes:</p>
              <p className="text-gray-800">{setting.notes || 'No notes'}</p>
            </div>

            <div className="flex gap-2 mt-4">
              <button
                onClick={handleUpdateSetting}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Update Setting
              </button>
              <button
                onClick={handleDeleteSetting}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                Delete Setting
              </button>
            </div>
          </div>
        ) : (
          <div>
            <p className="mb-4 text-gray-800">No compliance settings configured for this kid.</p>
            <button
              onClick={handleCreateTestSetting}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
            >
              Create Test Setting
            </button>
          </div>
        )}
      </div>

      {/* Dashboard Data */}
      {setting && (
        <>
          {dashboardLoading && <div className="mb-4">Loading dashboard data...</div>}
          {dashboardError && (
            <div className="mb-4 p-4 bg-red-50 text-red-700 rounded">
              Dashboard Error: {dashboardError}
            </div>
          )}

          {/* Hours Data */}
          <div className="mb-8 p-6 border rounded-lg">
            <h2 className="text-2xl font-bold mb-4">Compliance Hours</h2>
            {hours ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-blue-50 rounded">
                    <p className="text-sm text-gray-900">Total Hours</p>
                    <p className="text-3xl font-bold">{hours.total_hours}</p>
                    <p className="text-sm text-gray-900">
                      of {setting.required_annual_hours} required
                    </p>
                  </div>
                  <div className="p-4 bg-green-50 rounded">
                    <p className="text-sm text-gray-900">Total Days</p>
                    <p className="text-3xl font-bold">{hours.total_days}</p>
                    <p className="text-sm text-gray-900">
                      of {setting.required_annual_days} required
                    </p>
                  </div>
                </div>

                <div>
                  <p className="font-semibold mb-2">Hours by Subject:</p>
                  <div className="space-y-1">
                    {Object.entries(hours.subject_hours).map(([subject, subjectHours]) => (
                      <div key={subject} className="flex justify-between p-2 bg-gray-50 rounded">
                        <span>{subject}</span>
                        <span className="font-semibold">{subjectHours} hours</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="font-semibold mb-2">Hours by Month:</p>
                  <div className="space-y-1">
                    {Object.entries(hours.hours_by_month).map(([month, monthHours]) => (
                      <div key={month} className="flex justify-between p-2 bg-gray-50 rounded">
                        <span>{month}</span>
                        <span className="font-semibold">{monthHours} hours</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-gray-900">No hours data available</p>
            )}
          </div>

          {/* Health Score */}
          <div className="mb-8 p-6 border rounded-lg">
            <h2 className="text-2xl font-bold mb-4">Compliance Health Score</h2>
            {healthScore ? (
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="flex-1 p-4 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg">
                    <p className="text-sm text-gray-900">Overall Score</p>
                    <p className="text-4xl font-bold text-blue-600">{healthScore.overall_score}/100</p>
                    <p className="text-sm font-semibold mt-1 capitalize">
                      Status: {healthScore.status.replace('_', ' ')}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="p-4 bg-gray-50 rounded">
                    <p className="text-sm text-gray-900">Hours Score</p>
                    <p className="text-2xl font-bold">{healthScore.hours_score}/100</p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded">
                    <p className="text-sm text-gray-900">Days Score</p>
                    <p className="text-2xl font-bold">{healthScore.days_score}/100</p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded">
                    <p className="text-sm text-gray-900">Subjects Score</p>
                    <p className="text-2xl font-bold">{healthScore.subjects_score}/100</p>
                  </div>
                </div>

                {healthScore.alerts.length > 0 && (
                  <div>
                    <p className="font-semibold mb-2">⚠️ Alerts:</p>
                    <div className="space-y-2">
                      {healthScore.alerts.map((alert, i) => (
                        <div
                          key={i}
                          className={`p-3 rounded ${
                            alert.severity === 'high'
                              ? 'bg-red-50 text-red-800'
                              : alert.severity === 'medium'
                              ? 'bg-yellow-50 text-yellow-800'
                              : 'bg-blue-50 text-blue-800'
                          }`}
                        >
                          <p className="font-semibold">{alert.type.replace('_', ' ')}</p>
                          <p>{alert.message}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {healthScore.recommendations.length > 0 && (
                  <div>
                    <p className="font-semibold mb-2">💡 Recommendations:</p>
                    <div className="space-y-2">
                      {healthScore.recommendations.map((rec, i) => (
                        <div key={i} className="p-3 bg-green-50 text-green-800 rounded">
                          <p>{rec.message}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-gray-900">No health score data available</p>
            )}
          </div>
        </>
      )}

      {/* All Settings Summary */}
      <div className="mt-8 p-6 border rounded-lg bg-gray-50">
        <h2 className="text-2xl font-bold mb-4 text-gray-800">All Compliance Settings</h2>
        <p className="mb-2 text-gray-800">Total settings in organization: {settings.length}</p>
        <div className="space-y-2">
          {settings.map((s) => {
            const kid = kids.find(k => k.id === s.kid_id);
            return (
              <div key={s.id} className="p-3 bg-white rounded border">
                <p className="font-semibold">
                  {kid?.firstname} {kid?.lastname} - {s.state_name}
                </p>
                <p className="text-sm text-gray-900">
                  {s.required_annual_hours} hours / {s.required_annual_days} days required
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
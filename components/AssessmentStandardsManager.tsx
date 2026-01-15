// components/AssessmentStandardsManager.tsx
// Add, edit, and manage educational standards for an assessment

'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface Standard {
  id: string;
  code: string;
  description: string;
  subject: string;
  grade_level: number;
}

interface AssessmentStandard {
  id: string;
  user_standard_id: string;
  alignment_strength: 'primary' | 'supporting' | 'related';
  notes?: string;
  standard: Standard;
}

interface AssessmentStandardsManagerProps {
  assessmentId: string;
  assessmentTitle: string;
  onClose: () => void;
  onUpdate?: () => void;
}

export default function AssessmentStandardsManager({
  assessmentId,
  assessmentTitle,
  onClose,
  onUpdate
}: AssessmentStandardsManagerProps) {
  const [currentStandards, setCurrentStandards] = useState<AssessmentStandard[]>([]);
  const [availableStandards, setAvailableStandards] = useState<Standard[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [selectedGrade, setSelectedGrade] = useState<string>('all');

  const organizationId = 'd52497c0-42a9-49b7-ba3b-849bffa27fc4';

  useEffect(() => {
    loadData();
  }, [assessmentId]);

  const loadData = async () => {
    setLoading(true);

    // Load current standards aligned to this assessment
    const { data: currentData } = await supabase
      .from('assessment_standards')
      .select(`
        id,
        user_standard_id,
        alignment_strength,
        notes,
        user_standards!inner(
          id,
          code,
          description,
          subject,
          grade_level
        )
      `)
      .eq('assessment_id', assessmentId);

    // Load available standards for this organization
    const { data: availableData } = await supabase
      .from('user_standards')
      .select('*')
      .eq('organization_id', organizationId)
      .order('code');

    if (currentData) {
      setCurrentStandards(currentData.map(item => ({
        id: item.id,
        user_standard_id: item.user_standard_id,
        alignment_strength: item.alignment_strength,
        notes: item.notes,
        standard: Array.isArray(item.user_standards) 
          ? item.user_standards[0] 
          : item.user_standards
      })));
    }

    if (availableData) {
      setAvailableStandards(availableData);
    }

    setLoading(false);
  };

  const addStandard = async (standardId: string, strength: 'primary' | 'supporting' | 'related' = 'primary') => {
    setSaving(true);

    const { error } = await supabase
      .from('assessment_standards')
      .insert({
        assessment_id: assessmentId,
        user_standard_id: standardId,
        alignment_strength: strength,
        organization_id: organizationId
      });

    if (error) {
      console.error('Error adding standard:', error);
      alert('Failed to add standard');
    } else {
      await loadData();
      onUpdate?.();
    }

    setSaving(false);
  };

  const removeStandard = async (assessmentStandardId: string) => {
    if (!confirm('Remove this standard from the assessment?')) return;

    setSaving(true);

    const { error } = await supabase
      .from('assessment_standards')
      .delete()
      .eq('id', assessmentStandardId);

    if (error) {
      console.error('Error removing standard:', error);
      alert('Failed to remove standard');
    } else {
      await loadData();
      onUpdate?.();
    }

    setSaving(false);
  };

  const updateAlignment = async (assessmentStandardId: string, strength: string, notes?: string) => {
    setSaving(true);

    const { error } = await supabase
      .from('assessment_standards')
      .update({
        alignment_strength: strength,
        notes: notes
      })
      .eq('id', assessmentStandardId);

    if (error) {
      console.error('Error updating standard:', error);
      alert('Failed to update standard');
    } else {
      await loadData();
      onUpdate?.();
    }

    setSaving(false);
  };

  // Filter available standards
  const filteredStandards = availableStandards.filter(std => {
    // Exclude already added standards
    if (currentStandards.some(cs => cs.user_standard_id === std.id)) {
      return false;
    }

    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      if (!std.code.toLowerCase().includes(term) && 
          !std.description.toLowerCase().includes(term)) {
        return false;
      }
    }

    // Filter by subject
    if (selectedSubject !== 'all' && std.subject !== selectedSubject) {
      return false;
    }

    // Filter by grade
    if (selectedGrade !== 'all' && std.grade_level.toString() !== selectedGrade) {
      return false;
    }

    return true;
  });

  // Get unique subjects and grades for filters
  const subjects = Array.from(new Set(availableStandards.map(s => s.subject))).sort();
  const grades = Array.from(new Set(availableStandards.map(s => s.grade_level))).sort((a, b) => a - b);

  const getStrengthColor = (strength: string) => {
    switch (strength) {
      case 'primary': return 'bg-blue-100 text-blue-800';
      case 'supporting': return 'bg-green-100 text-green-800';
      case 'related': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-indigo-500 to-purple-600 text-white p-6 rounded-t-lg z-10">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold mb-2">📚 Manage Educational Standards</h2>
              <p className="text-indigo-100">{assessmentTitle}</p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-gray-200 text-2xl leading-none"
            >
              ×
            </button>
          </div>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="text-center py-12">
              <div className="text-4xl mb-4">⏳</div>
              <p>Loading standards...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left: Current Standards */}
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-4">
                  Aligned Standards ({currentStandards.length})
                </h3>

                {currentStandards.length === 0 ? (
                  <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                    <div className="text-4xl mb-2">📚</div>
                    <p className="text-gray-600">No standards aligned yet</p>
                    <p className="text-sm text-gray-500 mt-1">Add standards from the right panel</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {currentStandards.map(item => (
                      <div
                        key={item.id}
                        className="border-2 border-gray-200 rounded-lg p-4 hover:border-indigo-300 transition-all"
                      >
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div className="flex-1">
                            <div className="font-mono text-sm font-bold text-indigo-600 mb-1">
                              {item.standard.code}
                            </div>
                            <p className="text-sm text-gray-700">{item.standard.description}</p>
                            <div className="flex gap-2 mt-2">
                              <span className="text-xs px-2 py-1 bg-purple-100 text-purple-800 rounded">
                                Grade {item.standard.grade_level}
                              </span>
                              <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded">
                                {item.standard.subject}
                              </span>
                            </div>
                          </div>
                          <button
                            onClick={() => removeStandard(item.id)}
                            className="text-red-600 hover:text-red-700 text-lg"
                            disabled={saving}
                          >
                            ×
                          </button>
                        </div>

                        {/* Alignment Strength Selector */}
                        <div className="mt-3 pt-3 border-t border-gray-200">
                          <label className="text-xs font-medium text-gray-700 block mb-1">
                            Alignment Strength:
                          </label>
                          <div className="flex gap-2">
                            {['primary', 'supporting', 'related'].map(strength => (
                              <button
                                key={strength}
                                onClick={() => updateAlignment(item.id, strength, item.notes)}
                                className={`px-3 py-1 rounded text-xs font-medium transition-all ${
                                  item.alignment_strength === strength
                                    ? getStrengthColor(strength)
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                                disabled={saving}
                              >
                                {strength.charAt(0).toUpperCase() + strength.slice(1)}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Right: Available Standards */}
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-4">
                  Available Standards ({filteredStandards.length})
                </h3>

                {/* Filters */}
                <div className="text-gray-900 space-y-3 mb-4">
                  <input
                    type="text"
                    placeholder="Search by code or description..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />

                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={selectedSubject}
                      onChange={(e) => setSelectedSubject(e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="all">All Subjects</option>
                      {subjects.map(subject => (
                        <option key={subject} value={subject}>{subject}</option>
                      ))}
                    </select>

                    <select
                      value={selectedGrade}
                      onChange={(e) => setSelectedGrade(e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="all">All Grades</option>
                      {grades.map(grade => (
                        <option key={grade} value={grade}>Grade {grade}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Standards List */}
                <div className="space-y-2 max-h-[500px] overflow-y-auto">
                  {filteredStandards.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <div className="text-4xl mb-2">🔍</div>
                      <p>No standards found</p>
                      <p className="text-sm mt-1">Try adjusting your filters</p>
                    </div>
                  ) : (
                    filteredStandards.map(standard => (
                      <div
                        key={standard.id}
                        className="border border-gray-200 rounded-lg p-3 hover:border-indigo-300 hover:shadow-sm transition-all"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="font-mono text-xs font-bold text-indigo-600 mb-1">
                              {standard.code}
                            </div>
                            <p className="text-xs text-gray-700 line-clamp-2">
                              {standard.description}
                            </p>
                            <div className="flex gap-1 mt-1">
                              <span className="text-xs px-2 py-0.5 bg-purple-100 text-purple-800 rounded">
                                Grade {standard.grade_level}
                              </span>
                              <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-800 rounded">
                                {standard.subject}
                              </span>
                            </div>
                          </div>
                          <button
                            onClick={() => addStandard(standard.id)}
                            className="flex-shrink-0 px-3 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-700 text-xs font-medium disabled:opacity-50"
                            disabled={saving}
                          >
                            + Add
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="mt-6 pt-4 border-t flex justify-between items-center">
            <div className="text-sm text-gray-600">
              {currentStandards.length} standard{currentStandards.length !== 1 ? 's' : ''} aligned to this assessment
            </div>
            <button
              onClick={onClose}
              className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-medium"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
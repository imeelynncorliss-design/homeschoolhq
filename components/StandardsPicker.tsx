// ============================================================================
// StandardsPicker Component
// A comprehensive modal for browsing and selecting standards
// ============================================================================

'use client';

import { useState, useEffect } from 'react';
import type { Standard } from '@/types/standards';

interface StandardsPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (standards: Standard[]) => void;
  selectedStandards?: Standard[];
  defaultGradeLevel?: string;
  defaultSubject?: string;
  multiSelect?: boolean;
  title?: string;
}

export function StandardsPicker({
  isOpen,
  onClose,
  onSelect,
  selectedStandards = [],
  defaultGradeLevel = '3',
  defaultSubject = 'Mathematics',
  multiSelect = true,
  title = 'Select Standards',
}: StandardsPickerProps) {
  // State
  const [standards, setStandards] = useState<Standard[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    new Set(selectedStandards.map((s) => s.id))
  );
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [creatingStandard, setCreatingStandard] = useState(false);
  const [customStandard, setCustomStandard] = useState({
      standard_code: '',
      description: '',
      domain: ''
    });

  // Filters
  const [stateCode, setStateCode] = useState('CCSS');
  const [gradeLevel, setGradeLevel] = useState(defaultGradeLevel);
  const [subject, setSubject] = useState(defaultSubject);
  const [customSubject, setCustomSubject] = useState('');
  const [selectedDomain, setSelectedDomain] = useState<string>('');

  // Available options
  const gradeLevels = ['K', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];
  const subjects = ['Mathematics','English Language Arts','Science','Physics','Chemistry','Biology','History','Social Studies', 'Physical Education', 'Art', 'Music', 'Other'];

  // Fetch standards when filters change
  useEffect(() => {
    if (!isOpen) return;

    async function fetchStandards() {
      try {
        setLoading(true);
        const params = new URLSearchParams({
          state_code: stateCode,
          grade_level: gradeLevel,
          subject: subject === 'Other' ? customSubject : subject,
        });

        if (searchQuery) {
          params.set('search', searchQuery);
        }

        const response = await fetch(`/api/standards?${params.toString()}`);
        const result = await response.json();

        if (result.success) {
          setStandards(result.data.standards);
        }
      } catch (error) {
        console.error('Error fetching standards:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchStandards();
  }, [isOpen, stateCode, gradeLevel, subject, searchQuery]);

  // Create custom standard
async function createCustomStandard() {
  if (!customStandard.description.trim()) {
    alert('Description is required');
    return;
  }

  try {
    setCreatingStandard(true);
    
    const response = await fetch('/api/standards', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        state_code: stateCode,
        grade_level: gradeLevel,
        subject: subject === 'Other' ? customSubject : subject,
        standard_code: customStandard.standard_code || `CUSTOM-${Date.now()}`,
        description: customStandard.description,
        domain: customStandard.domain || 'Custom',
        source: 'User Created',
        framework: 'Custom'
      })
    });

    const result = await response.json();

    if (result.success) {
      // Reset form
      setCustomStandard({ standard_code: '', description: '', domain: '' });
      setShowCustomForm(false);
      
      // Refresh standards list
      const params = new URLSearchParams({
        state_code: stateCode,
        grade_level: gradeLevel,
        subject: subject === 'Other' ? customSubject : subject,
      });
      const refreshResponse = await fetch(`/api/standards?${params.toString()}`);
      const refreshResult = await refreshResponse.json();
      if (refreshResult.success) {
        setStandards(refreshResult.data.standards);
      }
      
      alert('Custom standard created successfully!');
    } else {
      alert('Failed to create standard: ' + result.error?.message);
    }
    } catch (error) {
      console.error('Error creating standard:', error);
      alert('Failed to create custom standard');
    } finally {
      setCreatingStandard(false);
   }
  }

  // Get unique domains from current standards
  const domains = Array.from(new Set(standards.map((s) => s.domain).filter(Boolean))
  ) as string [];

  // Filter by domain
  const filteredStandards = selectedDomain
    ? standards.filter((s) => s.domain === selectedDomain)
    : standards;

  // Group by domain for display
  const groupedStandards = filteredStandards.reduce((acc, standard) => {
    const domain = standard.domain || 'Other';
    if (!acc[domain]) acc[domain] = [];
    acc[domain].push(standard);
    return acc;
  }, {} as Record<string, Standard[]>);

  // Handle selection
  const toggleStandard = (standard: Standard) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(standard.id)) {
      newSelected.delete(standard.id);
    } else {
      if (!multiSelect) {
        newSelected.clear();
      }
      newSelected.add(standard.id);
    }
    setSelectedIds(newSelected);
  };

  const handleConfirm = () => {
    const selected = standards.filter((s) => selectedIds.has(s.id));
    onSelect(selected);
    onClose();
  };

  const handleClear = () => {
    setSelectedIds(new Set());
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative w-full max-w-4xl bg-white rounded-lg shadow-xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b p-6">
            <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl"
            >
              ×
            </button>
          </div>

          {/* Filters */}
          <div className="border-b p-6 space-y-4">
            {/* First Row: State, Grade, Subject */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  State/Standards
                </label>
                <select
                  value={stateCode}
                  onChange={(e) => setStateCode(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                >
                  <option value="CCSS">Common Core</option>
                  <option value="NC">North Carolina</option>
                  {/* Add more states as needed */}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Grade Level
                </label>
                <select
                  value={gradeLevel}
                  onChange={(e) => setGradeLevel(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                >
                  {gradeLevels.map((grade) => (
                    <option key={grade} value={grade}>
                      Grade {grade}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Subject
                </label>
                {/* Subject dropdown */}
            <select
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
            >
              {subjects.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>

                {/* Show text input if "Other" is selected */}
                {subject === 'Other' && (
                  <input
                    type="text"
                    placeholder="Enter custom subject..."
                    value={customSubject}
                    onChange={(e) => setCustomSubject(e.target.value)}
                    className="mt-2 w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                )}
              </div>
            </div>

            {/* Second Row: Domain Filter & Search */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Domain (Optional)
                </label>
                <select
                  value={selectedDomain}
                  onChange={(e) => setSelectedDomain(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder:text-gray-600"
                >
                  <option value="">All Domains</option>
                  {domains.map((domain) => (
                    <option key={domain} value={domain || ''}>
                      {domain}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Search
                </label>
                <input
                  type="text"
                  placeholder="Search standards..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                />
              </div>
            </div>
          </div>

          {/* Standards List */}
          <div className="p-6 max-h-96 overflow-y-auto">
            <div className="mb-4 pb-4 border-b border-gray-200">
              {!showCustomForm ? (
                <button
                  onClick={() => setShowCustomForm(true)}
                  className="w-full py-2 px-4 border-2 border-dashed border-blue-300 text-blue-600 rounded-lg hover:bg-blue-50 hover:border-blue-400 transition-colors font-medium flex items-center justify-center gap-2"
                >
                 <span className="text-xl">+</span>
                 Create Custom Standard
               </button>
             ) : (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="font-semibold text-gray-900">Create Custom Standard</h4>
                  <button
                    onClick={() => {
                      setShowCustomForm(false);
                      setCustomStandard({ standard_code: '', description: '', domain: '' });
                     }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                     ✕
                  </button>
                </div>

                <div className="space-y-3">
                  <div>
                     <label className="block text-sm font-medium text-gray-700 mb-1">
                       Standard Code (Optional)
                     </label>
                     <input
                        type="text"
                        placeholder="e.g., TX.PHY.11.2A"
                        value={customStandard.standard_code}
                        onChange={(e) => setCustomStandard({ ...customStandard, standard_code: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                         Description <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        placeholder="Describe what the student should know or be able to do..."
                        value={customStandard.description}
                        onChange={(e) => setCustomStandard({ ...customStandard, description: e.target.value })}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Domain (Optional)
                      </label>
                      <input
                        type="text"
                        placeholder="e.g., Forces and Motion"
                        value={customStandard.domain}
                        onChange={(e) => setCustomStandard({ ...customStandard, domain: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                      />
                    </div>

                    <div className="flex gap-2 pt-2">
                      <button
                        onClick={createCustomStandard}
                        disabled={creatingStandard || !customStandard.description.trim()}
                        className="flex-1 bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {creatingStandard ? 'Creating...' : 'Create Standard'}
                      </button>
                      <button
                        onClick={() => {
                          setShowCustomForm(false);
                          setCustomStandard({ standard_code: '', description: '', domain: '' });
                        }}
                        className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                    </div>

                     <p className="text-xs text-gray-500">
                        Will be created for: {subject === 'Other' ? customSubject : subject}, Grade {gradeLevel}
                      </p>
                    </div>
                  </div>
                )}
              </div>

            {loading ? (
              <div className="text-center py-8 text-gray-500">Loading standards...</div>
            ) : filteredStandards.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No standards found. Try adjusting your filters.
              </div>
            ) : (
              <div className="space-y-6">
                {Object.entries(groupedStandards).map(([domain, domainStandards]) => (
                  <div key={domain}>
                    <h3 className="font-semibold text-gray-900 mb-3 text-lg">
                      {domain}
                    </h3>
                    <div className="space-y-2">
                      {domainStandards.map((standard) => {
                        const isSelected = selectedIds.has(standard.id);
                        return (
                          <div
                            key={standard.id}
                            onClick={() => toggleStandard(standard)}
                            className={`
                              p-3 border rounded-md cursor-pointer transition-colors
                              ${
                                isSelected
                                  ? 'border-blue-500 bg-blue-50'
                                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                              }
                            `}
                          >
                            <div className="flex items-start">
                              <input
                                type={multiSelect ? 'checkbox' : 'radio'}
                                checked={isSelected}
                                onChange={() => {}}
                                className="mt-1 mr-3"
                              />
                              <div className="flex-1">
                                <div className="font-medium text-gray-900">
                                  {standard.standard_code}
                                </div>
                                <div className="text-sm text-gray-600 mt-1">
                                  {standard.description}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t p-6 bg-gray-50 flex items-center justify-between">
            <div className="text-sm text-gray-600">
              {selectedIds.size} standard{selectedIds.size !== 1 ? 's' : ''} selected
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleClear}
                disabled={selectedIds.size === 0}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Clear
              </button>
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                disabled={selectedIds.size === 0}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Add {selectedIds.size > 0 ? `(${selectedIds.size})` : ''}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
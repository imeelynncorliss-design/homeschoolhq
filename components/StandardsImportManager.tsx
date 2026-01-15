// components/StandardsImportManager.tsx
'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

type Template = {
  id: string;
  state_code: string;
  grade_level: string;
  subject: string;
  standard_code: string;
  description: string;
  domain: string | null;
  source_name: string | null;
};

type StandardsImportManagerProps = {
  onClose: () => void;
  onImport: () => void;
};

export default function StandardsImportManager({ onClose, onImport }: StandardsImportManagerProps) {
  const [activeTab, setActiveTab] = useState<'browse' | 'custom'>('browse');
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [importing, setImporting] = useState(false);
  
  // Filters
  const [stateFilter, setStateFilter] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('');
  const [gradeFilter, setGradeFilter] = useState('');

  // Custom standard form
  const [customForm, setCustomForm] = useState({
    state_code: '',
    grade_level: '',
    subject: '',
    standard_code: '',
    description: '',
    domain: ''
  });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadTemplates();
  }, [stateFilter, subjectFilter, gradeFilter]);

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (stateFilter) params.append('state_code', stateFilter);
      if (subjectFilter) params.append('subject', subjectFilter);
      if (gradeFilter) params.append('grade_level', gradeFilter);

      const response = await fetch(`/api/standards/templates?${params.toString()}`);
      const result = await response.json();
      
      if (result.success) {
        setTemplates(result.data.templates);
      }
    } catch (error) {
      console.error('Error loading templates:', error);
    }
    setLoading(false);
  };

  const toggleSelection = (id: string) => {
    const newSelection = new Set(selectedIds);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setSelectedIds(newSelection);
  };

  const selectAll = () => {
    setSelectedIds(new Set(templates.map(t => t.id)));
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  const importSelected = async () => {
    if (selectedIds.size === 0) return;
    
    setImporting(true);
    try {
      const supabase = createClient(supabaseUrl, supabaseKey);
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        alert('Please sign in to import standards');
        return;
      }

      const response = await fetch('/api/standards/templates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          template_ids: Array.from(selectedIds)
        })
      });

      const result = await response.json();
      
      if (result.success) {
        alert(`Successfully imported ${result.data.imported} standards!`);
        clearSelection();
        onImport();
      } else {
        alert('Error importing standards: ' + result.error.message);
      }
    } catch (error) {
      console.error('Error importing:', error);
      alert('Error importing standards');
    }
    setImporting(false);
  };

  const createCustom = async () => {
    if (!customForm.grade_level || !customForm.subject || !customForm.description) {
      alert('Please fill in required fields: Grade Level, Subject, and Description');
      return;
    }

    setCreating(true);
    try {
      const supabase = createClient(supabaseUrl, supabaseKey);
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        alert('Please sign in to create standards');
        return;
      }

      const response = await fetch('/api/standards', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          state_code: customForm.state_code || 'CUSTOM',
          grade_level: customForm.grade_level,
          subject: customForm.subject,
          standard_code: customForm.standard_code || `CUSTOM-${Date.now()}`,
          description: customForm.description,
          domain: customForm.domain || 'Custom'
        })
      });

      const result = await response.json();
      
      if (result.success) {
        alert('Successfully created custom standard!');
        setCustomForm({
          state_code: '',
          grade_level: '',
          subject: '',
          standard_code: '',
          description: '',
          domain: ''
        });
        onImport();
      } else {
        alert('Error creating standard: ' + result.error.message);
      }
    } catch (error) {
      console.error('Error creating:', error);
      alert('Error creating standard');
    }
    setCreating(false);
  };

  const availableStates = [...new Set(templates.map(t => t.state_code))].sort();
  const availableSubjects = [...new Set(templates.map(t => t.subject))].sort();
  const availableGrades = [...new Set(templates.map(t => t.grade_level))].sort();

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-slate-200">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-2xl font-black text-slate-900">Import Standards</h2>
              <p className="text-sm text-slate-600 mt-1">Browse templates or create your own standards</p>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 text-2xl font-bold"
            >
              ×
            </button>
          </div>

          {/* Disclaimer */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm">
            <p className="text-amber-900 font-medium">
              ⚠️ <strong>Important:</strong> Standards provided are examples only. Parents are responsible for verifying alignment with their state requirements and keeping standards current.
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-slate-200">
          <div className="flex">
            <button
              onClick={() => setActiveTab('browse')}
              className={`flex-1 py-4 px-6 font-bold transition-colors ${
                activeTab === 'browse'
                  ? 'text-purple-600 border-b-2 border-purple-600'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              📚 Browse Templates ({templates.length})
            </button>
            <button
              onClick={() => setActiveTab('custom')}
              className={`flex-1 py-4 px-6 font-bold transition-colors ${
                activeTab === 'custom'
                  ? 'text-purple-600 border-b-2 border-purple-600'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              ✏️ Create Custom
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'browse' && (
            <div className="space-y-6">
              {/* Filters */}
              <div className="grid grid-cols-3 gap-4">
                <select
                  value={stateFilter}
                  onChange={(e) => setStateFilter(e.target.value)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-900 font-medium"
                >
                  <option value="">All States</option>
                  {availableStates.map(state => (
                    <option key={state} value={state}>{state}</option>
                  ))}
                </select>

                <select
                  value={subjectFilter}
                  onChange={(e) => setSubjectFilter(e.target.value)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-900 font-medium"
                >
                  <option value="">All Subjects</option>
                  {availableSubjects.map(subject => (
                    <option key={subject} value={subject}>{subject}</option>
                  ))}
                </select>

                <select
                  value={gradeFilter}
                  onChange={(e) => setGradeFilter(e.target.value)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-900 font-medium"
                >
                  <option value="">All Grades</option>
                  {availableGrades.map(grade => (
                    <option key={grade} value={grade}>Grade {grade}</option>
                  ))}
                </select>
              </div>

              {/* Selection controls */}
              {templates.length > 0 && (
                <div className="flex justify-between items-center">
                  <div className="text-sm text-slate-600">
                    {selectedIds.size} of {templates.length} selected
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={selectAll}
                      className="text-sm text-purple-600 hover:text-purple-700 font-medium"
                    >
                      Select All
                    </button>
                    <button
                      onClick={clearSelection}
                      className="text-sm text-slate-600 hover:text-slate-700 font-medium"
                    >
                      Clear
                    </button>
                  </div>
                </div>
              )}

              {/* Templates list */}
              {loading ? (
                <div className="text-center py-12 text-slate-500">Loading templates...</div>
              ) : templates.length === 0 ? (
                <div className="text-center py-12 text-slate-500">No templates found</div>
              ) : (
                <div className="space-y-2">
                  {templates.map((template) => (
                    <label
                      key={template.id}
                      className={`flex items-start gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                        selectedIds.has(template.id)
                          ? 'border-purple-600 bg-purple-50'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedIds.has(template.id)}
                        onChange={() => toggleSelection(template.id)}
                        className="mt-1 w-5 h-5 text-purple-600 rounded"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs font-bold">
                            {template.state_code}
                          </span>
                          <span className="px-2 py-1 bg-slate-100 text-slate-700 rounded text-xs font-bold">
                            Grade {template.grade_level}
                          </span>
                          <span className="px-2 py-1 bg-slate-100 text-slate-700 rounded text-xs font-bold">
                            {template.subject}
                          </span>
                        </div>
                        <div className="font-bold text-slate-900 mb-1">{template.standard_code}</div>
                        <p className="text-sm text-slate-600">{template.description}</p>
                        {template.domain && (
                          <p className="text-xs text-slate-500 mt-1">Domain: {template.domain}</p>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'custom' && (
            <div className="space-y-4 max-w-2xl">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">
                    State Code (Optional)
                  </label>
                  <input
                    type="text"
                    value={customForm.state_code}
                    onChange={(e) => setCustomForm({ ...customForm, state_code: e.target.value })}
                    placeholder="e.g., CA, TX, CUSTOM"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">
                    Grade Level <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={customForm.grade_level}
                    onChange={(e) => setCustomForm({ ...customForm, grade_level: e.target.value })}
                    placeholder="e.g., 3, 9, K"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-900"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  Subject <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={customForm.subject}
                  onChange={(e) => setCustomForm({ ...customForm, subject: e.target.value })}
                  placeholder="e.g., Mathematics, Science"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-900"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  Standard Code (Optional)
                </label>
                <input
                  type="text"
                  value={customForm.standard_code}
                  onChange={(e) => setCustomForm({ ...customForm, standard_code: e.target.value })}
                  placeholder="Leave blank for auto-generated code"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-900"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  Domain (Optional)
                </label>
                <input
                  type="text"
                  value={customForm.domain}
                  onChange={(e) => setCustomForm({ ...customForm, domain: e.target.value })}
                  placeholder="e.g., Number & Operations, Forces & Motion"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-900"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={customForm.description}
                  onChange={(e) => setCustomForm({ ...customForm, description: e.target.value })}
                  placeholder="Describe what the student should know or be able to do..."
                  rows={4}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-900"
                  required
                />
              </div>

              <button
                onClick={createCustom}
                disabled={creating}
                className="w-full px-6 py-4 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {creating ? 'Creating...' : 'Create Custom Standard'}
              </button>
            </div>
          )}
        </div>

        {/* Footer - only show for browse tab */}
        {activeTab === 'browse' && (
          <div className="p-6 border-t border-slate-200 flex justify-between items-center">
            <button
              onClick={onClose}
              className="px-6 py-3 text-slate-600 hover:text-slate-800 font-bold"
            >
              Cancel
            </button>
            <button
              onClick={importSelected}
              disabled={selectedIds.size === 0 || importing}
              className="px-6 py-3 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {importing ? 'Importing...' : `Import ${selectedIds.size} Standard${selectedIds.size !== 1 ? 's' : ''}`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
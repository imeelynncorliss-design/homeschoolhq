'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

interface Standard {
  id: string;
  state_code: string;
  grade_level: string;
  subject: string;
  standard_code: string;
  description: string;
  domain?: string;
  source?: string;
  customized: boolean;
  created_at: string;
}

interface StandardsManagerProps {
  organizationId: string;
  onClose: () => void;
}

export default function StandardsManager({ organizationId, onClose }: StandardsManagerProps) {
  const [standards, setStandards] = useState<Standard[]>([]);
  const [filteredStandards, setFilteredStandards] = useState<Standard[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState('');
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSubject, setFilterSubject] = useState('');
  const [filterGrade, setFilterGrade] = useState('');
  const [filterState, setFilterState] = useState('');

  // Get unique values for filters
  const subjects = Array.from(new Set(standards.map(s => s.subject))).sort();
  const grades = Array.from(new Set(standards.map(s => s.grade_level))).sort();
  const states = Array.from(new Set(standards.map(s => s.state_code))).sort();

  useEffect(() => {
    loadStandards();
  }, [organizationId]);

  useEffect(() => {
    applyFilters();
  }, [standards, searchTerm, filterSubject, filterGrade, filterState]);

  const loadStandards = async () => {
    setLoading(true);
    setError('');

    console.log('Loading standards for organization:', organizationId);

    try {
      const supabase = createClient(supabaseUrl, supabaseKey);
      const { data, error: fetchError } = await supabase
        .from('user_standards')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });

      console.log('Standards loaded:', data?.length || 0);
      if (fetchError) {
        console.error('Error loading standards:', fetchError);
        throw fetchError;
      }

      setStandards(data || []);
    } catch (err: any) {
      console.error('Error loading standards:', err);
      setError('Failed to load standards');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...standards];

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(s =>
        s.standard_code.toLowerCase().includes(term) ||
        s.description.toLowerCase().includes(term) ||
        s.domain?.toLowerCase().includes(term)
      );
    }

    // Subject filter
    if (filterSubject) {
      filtered = filtered.filter(s => s.subject === filterSubject);
    }

    // Grade filter
    if (filterGrade) {
      filtered = filtered.filter(s => s.grade_level === filterGrade);
    }

    // State filter
    if (filterState) {
      filtered = filtered.filter(s => s.state_code === filterState);
    }

    setFilteredStandards(filtered);
  };

  const handleDelete = async (standardId: string) => {
    if (!confirm('Are you sure you want to delete this standard? This action cannot be undone.')) {
      return;
    }

    setDeleting(standardId);
    setError('');

    try {
      const supabase = createClient(supabaseUrl, supabaseKey);
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        setError('Please sign in to delete standards');
        setDeleting(null);
        return;
      }

      const response = await fetch(`/api/standards/${standardId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      const result = await response.json();

      if (result.success) {
        // Remove from local state
        setStandards(prev => prev.filter(s => s.id !== standardId));
        alert('Standard deleted successfully');
      } else {
        setError(result.error?.message || 'Failed to delete standard');
      }
    } catch (err: any) {
      console.error('Delete error:', err);
      setError(err.message || 'Error deleting standard');
    } finally {
      setDeleting(null);
    }
  };

  const clearFilters = () => {
    setSearchTerm('');
    setFilterSubject('');
    setFilterGrade('');
    setFilterState('');
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-slate-200">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-2xl font-black text-slate-900">Manage Standards</h2>
              <p className="text-sm text-slate-600 mt-1">
                View, search, and delete standards for your organization
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 text-2xl font-bold"
            >
              ×
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mt-4">
            <div className="bg-blue-50 rounded-xl p-3">
              <p className="text-xs text-blue-600 font-semibold">Total Standards</p>
              <p className="text-2xl font-black text-blue-900">{standards.length}</p>
            </div>
            <div className="bg-green-50 rounded-xl p-3">
              <p className="text-xs text-green-600 font-semibold">After Filters</p>
              <p className="text-2xl font-black text-green-900">{filteredStandards.length}</p>
            </div>
            <div className="bg-purple-50 rounded-xl p-3">
              <p className="text-xs text-purple-600 font-semibold">Custom Standards</p>
              <p className="text-2xl font-black text-purple-900">
                {standards.filter(s => s.customized).length}
              </p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="p-6 border-b border-slate-200 bg-slate-50">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
            <input
              type="text"
              placeholder="Search code, description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-900"
            />
            <select
              value={filterSubject}
              onChange={(e) => setFilterSubject(e.target.value)}
              className="px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-900"
            >
              <option value="">All Subjects</option>
              {subjects.map(subject => (
                <option key={subject} value={subject}>{subject}</option>
              ))}
            </select>
            <select
              value={filterGrade}
              onChange={(e) => setFilterGrade(e.target.value)}
              className="px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-900"
            >
              <option value="">All Grades</option>
              {grades.map(grade => (
                <option key={grade} value={grade}>Grade {grade}</option>
              ))}
            </select>
            <select
              value={filterState}
              onChange={(e) => setFilterState(e.target.value)}
              className="px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-900"
            >
              <option value="">All States</option>
              {states.map(state => (
                <option key={state} value={state}>{state}</option>
              ))}
            </select>
          </div>
          {(searchTerm || filterSubject || filterGrade || filterState) && (
            <button
              onClick={clearFilters}
              className="text-sm text-purple-600 hover:text-purple-700 font-semibold"
            >
              Clear all filters
            </button>
          )}
        </div>

        {/* Standards List */}
        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
              <p className="text-red-900 text-sm">{error}</p>
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin h-8 w-8 border-4 border-purple-600 border-t-transparent rounded-full"></div>
            </div>
          ) : filteredStandards.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-slate-500">
                {standards.length === 0 
                  ? 'No standards found. Import some standards to get started!'
                  : 'No standards match your filters. Try adjusting your search.'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredStandards.map(standard => (
                <div
                  key={standard.id}
                  className="border border-slate-200 rounded-xl p-4 hover:border-slate-300 transition-colors"
                >
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className="inline-flex items-center px-2 py-1 rounded-md bg-blue-100 text-blue-700 text-xs font-bold">
                          {standard.state_code}
                        </span>
                        <span className="inline-flex items-center px-2 py-1 rounded-md bg-green-100 text-green-700 text-xs font-bold">
                          Grade {standard.grade_level}
                        </span>
                        <span className="inline-flex items-center px-2 py-1 rounded-md bg-purple-100 text-purple-700 text-xs font-bold">
                          {standard.subject}
                        </span>
                        {standard.customized && (
                          <span className="inline-flex items-center px-2 py-1 rounded-md bg-orange-100 text-orange-700 text-xs font-bold">
                            Custom
                          </span>
                        )}
                      </div>
                      <p className="font-bold text-slate-900 mb-1">{standard.standard_code}</p>
                      <p className="text-sm text-slate-700 mb-2">{standard.description}</p>
                      {standard.domain && (
                        <p className="text-xs text-slate-500">
                          <strong>Domain:</strong> {standard.domain}
                        </p>
                      )}
                      {standard.source && (
                        <p className="text-xs text-slate-500">
                          <strong>Source:</strong> {standard.source}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => handleDelete(standard.id)}
                      disabled={deleting === standard.id}
                      className="flex-shrink-0 p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                      title="Delete standard"
                    >
                      {deleting === standard.id ? (
                        <div className="animate-spin h-5 w-5 border-2 border-red-600 border-t-transparent rounded-full"></div>
                      ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-200 flex justify-between items-center">
          <p className="text-sm text-slate-600">
            Showing {filteredStandards.length} of {standards.length} standards
          </p>
          <button
            onClick={onClose}
            className="px-6 py-3 bg-slate-600 text-white rounded-xl font-bold hover:bg-slate-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
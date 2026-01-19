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
  source_url?: string;
  is_verified: boolean;
  organization_id: string | null;
  created_at: string;
}

interface StandardsManagerProps {
  organizationId: string;
  onClose: () => void;
}

export default function StandardsManager({ organizationId, onClose }: StandardsManagerProps) {
  // --- 1. Consolidated State ---
  const [allStandards, setAllStandards] = useState<Standard[]>([]); 
  const [filteredStandards, setFilteredStandards] = useState<Standard[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState('');
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSubject, setFilterSubject] = useState('');
  const [filterGrade, setFilterGrade] = useState('');

  // --- 2. Data Loading ---
  useEffect(() => {
    loadStandards();
  }, [organizationId]);

  // Re-run filters whenever search terms OR the master list changes
  useEffect(() => {
    applyFilters();
  }, [allStandards, searchTerm, filterSubject, filterGrade]);

  const loadStandards = async () => {
    setLoading(true);
    setError('');
    try {
      const supabase = createClient(supabaseUrl, supabaseKey);
      const { data, error: fetchError } = await supabase
        .from('standards')
        .select('*')
        .or(`organization_id.is.null,organization_id.eq.${organizationId}`)
        .order('is_verified', { ascending: false })
        .order('grade_level', { ascending: true });

      if (fetchError) throw fetchError;
      
      const loadedData = data || [];
      setAllStandards(loadedData);
      setFilteredStandards(loadedData); // Initialize filtered list too
    } catch (err: any) {
      console.error('Error loading standards:', err);
      setError('Failed to load standards');
    } finally {
      setLoading(false);
    }
  };

  // --- 3. Robust Filtering Logic ---
  const applyFilters = () => {
    let filtered = [...allStandards];

    // Search term filter (Code or Description)
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(s =>
        s.standard_code.toLowerCase().includes(term) ||
        s.description.toLowerCase().includes(term)
      );
    }
  
    // Robust Subject Filter
    if (filterSubject) {
      filtered = filtered.filter(s => 
        s.subject?.toLowerCase().trim().includes(filterSubject.toLowerCase().trim())
      );
    }
  
    // Robust Grade Level Filter
    if (filterGrade) {
      filtered = filtered.filter(s => {
        const standardGrade = String(s.grade_level || "").toLowerCase().trim();
        const searchGrade = String(filterGrade).toLowerCase().trim();
        return standardGrade.includes(searchGrade) || searchGrade.includes(standardGrade);
      });
    }
  
    setFilteredStandards(filtered);
  };

  const handleDelete = async (standardId: string) => {
    if (!confirm('Are you sure you want to delete this standard?')) return;
    
    const standardToDelete = allStandards.find(s => s.id === standardId);
    if (standardToDelete?.is_verified) {
      alert("System-provided standards cannot be deleted.");
      return;
    }

    setDeleting(standardId);
    try {
      const supabase = createClient(supabaseUrl, supabaseKey);
      const { error: deleteError } = await supabase
        .from('standards')
        .delete()
        .eq('id', standardId)
        .eq('organization_id', organizationId);

      if (deleteError) throw deleteError;
      
      // Update the master list so the UI refreshes
      setAllStandards(prev => prev.filter(s => s.id !== standardId));
    } catch (err: any) {
      setError(err.message || 'Error deleting standard');
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl border border-slate-200">
        
        {/* Header */}
        <div className="p-8 border-b border-slate-100">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-3xl font-black text-slate-900 tracking-tight">Manage Standards</h2>
              <p className="text-slate-500 font-bold mt-1">Review verified core standards and your custom imports.</p>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-900 text-3xl font-bold transition-colors">×</button>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4">
              <p className="text-[10px] text-indigo-600 font-black uppercase tracking-widest">Verified Core</p>
              <p className="text-3xl font-black text-indigo-900">{allStandards.filter(s => s.is_verified).length}</p>
            </div>
            <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4">
              <p className="text-[10px] text-amber-600 font-black uppercase tracking-widest">Your Imports</p>
              <p className="text-3xl font-black text-amber-900">{allStandards.filter(s => !s.is_verified).length}</p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="px-8 py-6 bg-slate-50 border-b border-slate-200">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input
              type="text"
              placeholder="Search code or keywords..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="px-4 py-3 rounded-xl border-2 border-slate-200 text-slate-900 font-bold outline-none focus:border-purple-600 transition-all placeholder:text-slate-400"
            />
            <select value={filterSubject} onChange={(e) => setFilterSubject(e.target.value)} className="px-4 py-3 rounded-xl border-2 border-slate-200 text-slate-900 font-bold">
              <option value="">All Subjects</option>
              {Array.from(new Set(allStandards.map(s => s.subject))).filter(Boolean).sort().map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <select value={filterGrade} onChange={(e) => setFilterGrade(e.target.value)} className="px-4 py-3 rounded-xl border-2 border-slate-200 text-slate-900 font-bold">
              <option value="">All Grades</option>
              {Array.from(new Set(allStandards.map(s => s.grade_level))).filter(Boolean).sort().map(g => <option key={g} value={g}>Grade {g}</option>)}
            </select>
          </div>
        </div>

        {/* List Content */}
        <div className="flex-1 overflow-y-auto p-8 bg-white min-h-[400px]">
          {error && <div className="bg-red-50 border-2 border-red-100 rounded-xl p-4 mb-6 text-red-700 font-bold text-sm">{error}</div>}
          
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <div className="animate-spin h-10 w-10 border-4 border-indigo-600 border-t-transparent rounded-full"></div>
              <p className="text-slate-500 font-black uppercase tracking-widest text-xs">Loading Standards...</p>
            </div>
          ) : (
            <div className="space-y-4">
             {filteredStandards.map(standard => (
              <div key={standard.id} className={`border-2 rounded-2xl p-6 transition-all flex gap-6 ${standard.is_verified ? 'border-slate-100' : 'border-amber-100 bg-amber-50/20'}`}>
                
                <div className="flex-shrink-0">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-lg border ${standard.is_verified ? 'bg-slate-900 border-slate-700' : 'bg-amber-600 border-amber-500'}`}>
                    <span className="text-white font-black text-xl">
                      {standard.subject?.toLowerCase().includes('math') ? '🔢' : '📚'}
                    </span>
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-3 flex-wrap">
                    <span className="px-2 py-1 rounded-lg bg-slate-100 text-slate-700 text-[10px] font-black uppercase tracking-wider border border-slate-200">
                      {standard.standard_code}
                    </span>
                    {standard.is_verified ? (
                      <span className="px-2 py-1 rounded-lg bg-indigo-100 text-indigo-700 text-[10px] font-black uppercase tracking-wider border border-indigo-200">
                        Official Core
                      </span>
                    ) : (
                      <span className="px-2 py-1 rounded-lg bg-amber-100 text-amber-700 text-[10px] font-black uppercase tracking-wider border border-amber-200">
                        User Uploaded
                      </span>
                    )}
                    <span className="px-2 py-1 rounded-lg bg-green-50 text-green-700 text-[10px] font-black uppercase tracking-wider border border-green-100">
                      Grade {standard.grade_level}
                    </span>
                  </div>
                  
                  <p className="text-slate-900 font-medium text-lg leading-relaxed mb-2 whitespace-normal break-words">
                    {standard.description}
                  </p>
                  
                  <div className="flex gap-4 items-center">
                    {standard.domain && (
                      <p className="text-xs text-slate-500 font-bold">
                        Domain: <span className="text-slate-700">{standard.domain}</span>
                      </p>
                    )}
                    {standard.source_url && (
                      <a href={standard.source_url} target="_blank" className="text-[10px] text-blue-500 font-black uppercase hover:underline">
                        View Document Source ↗
                      </a>
                    )}
                  </div>
                </div>

                {!standard.is_verified && (
                  <button
                    onClick={() => handleDelete(standard.id)}
                    disabled={deleting === standard.id}
                    className="self-start p-3 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                  >
                    {deleting === standard.id ? (
                      <div className="animate-spin h-5 w-5 border-2 border-red-600 border-t-transparent rounded-full"></div>
                    ) : (
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    )}
                  </button>
                )}
              </div>
            ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-8 border-t border-slate-100 flex justify-between items-center bg-slate-50">
          <p className="text-sm text-slate-500 font-bold italic">Showing {filteredStandards.length} standards</p>
          <button onClick={onClose} className="px-10 py-4 bg-slate-900 text-white rounded-2xl font-black hover:bg-black transition-all shadow-lg active:scale-95">
            Close Manager
          </button>
        </div>
      </div>
    </div>
  );
}
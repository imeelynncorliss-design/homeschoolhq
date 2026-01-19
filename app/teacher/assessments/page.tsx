'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

interface StandardProgress {
  id: string;
  standard_code: string;
  statement: string;
  subject: string;
  grade_level: string;
  category: string;
  lesson_count: number;
  assessment_count: number;
  avg_score: number | null;
  last_assessed: string | null;
  mastery_level: 'not_started' | 'introduced' | 'practicing' | 'proficient' | 'mastered';
}

interface Kid {
  id: string;
  displayname: string;
}

export default function TeacherAssessmentsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [standards, setStandards] = useState<StandardProgress[]>([]);
  const [kids, setKids] = useState<Kid[]>([]);
  const [selectedKid, setSelectedKid] = useState<string>('all');
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [selectedMastery, setSelectedMastery] = useState<string>('all');
  const [organizationId, setOrganizationId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (organizationId) {
      loadStandardsProgress();
    }
  }, [organizationId, selectedKid, selectedSubject, selectedMastery]);

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        if (window.location.hostname === 'localhost') {
          setOrganizationId('00000000-0000-0000-0000-000000000000');
          setKids([{ id: 'dev-1', displayname: 'Test Student' }]);
          setLoading(false);
          return;
        }
        router.push('/'); 
        return; 
      }

      const { data: settings } = await supabase.from('school_year_settings').select('organization_id').eq('user_id', user.id).maybeSingle();
      setOrganizationId(settings?.organization_id || user.id);

      const { data: kidsData } = await supabase.from('kids').select('id, displayname').order('displayname');
      if (kidsData) setKids(kidsData);
    } catch (error) {
      console.error('Error loading initial data:', error);
    }
  };

  const loadStandardsProgress = async () => {
    // 🛠️ DEV BYPASS: This stops the "No session found" error on localhost
    if (!organizationId || organizationId === '00000000-0000-0000-0000-000000000000') {
      setLoading(true);
      const mockData: StandardProgress[] = [
        { id: 'm1', standard_code: 'MATH.1.OA.1', statement: 'Addition and subtraction within 20.', subject: 'Math', grade_level: '1st', category: 'Operations', lesson_count: 8, assessment_count: 3, avg_score: 95, last_assessed: new Date().toISOString(), mastery_level: 'mastered' },
        { id: 'm2', standard_code: 'ELA.1.RL.1', statement: 'Key details in a text.', subject: 'English', grade_level: '1st', category: 'Reading', lesson_count: 4, assessment_count: 1, avg_score: 72, last_assessed: new Date().toISOString(), mastery_level: 'introduced' },
        { id: 'm3', standard_code: 'SCI.1.P.1', statement: 'Forces and motion.', subject: 'Science', grade_level: '1st', category: 'Physics', lesson_count: 6, assessment_count: 4, avg_score: 84, last_assessed: new Date().toISOString(), mastery_level: 'proficient' }
      ];

      let filtered = mockData;
      if (selectedSubject !== 'all') filtered = filtered.filter(s => s.subject === selectedSubject);
      if (selectedMastery !== 'all') filtered = filtered.filter(s => s.mastery_level === selectedMastery);
      setStandards(filtered);
      setLoading(false);
      return; 
    }

    setLoading(true);
    try {
      const { data: userStandards, error: standardsError } = await supabase.from('user_standards').select('*').eq('organization_id', organizationId);
      if (standardsError) throw standardsError;
      if (!userStandards) { setStandards([]); return; }

      const progressData = await Promise.all(
        userStandards.map(async (standard: any) => {
          const { count: lessonCount } = await supabase.from('lessons').select('*', { count: 'exact', head: true }).eq('subject', standard.subject).in('kid_id', selectedKid === 'all' ? kids.map(k => k.id) : [selectedKid]);
          const { data: assessmentLinks } = await supabase.from('assessment_standards').select('assessment_id, assessments!inner(id, lesson_id, lessons!inner(kid_id))').eq('user_standard_id', standard.id);

          let filteredLinks = (assessmentLinks || []) as any[];
          if (selectedKid !== 'all') filteredLinks = filteredLinks.filter(l => l.assessments?.lessons?.kid_id === selectedKid);
          const assessmentIds = filteredLinks.map(l => l.assessment_id);
          
          let avgScore: number | null = null;
          let lastDate: string | null = null;

          if (assessmentIds.length > 0) {
            const { data: results } = await supabase.from('assessment_results').select('auto_score, submitted_at').in('assessment_id', assessmentIds).not('auto_score', 'is', null).order('submitted_at', { ascending: false });
            if (results && results.length > 0) {
              const validScores = results.map(r => r.auto_score).filter(s => s !== null);
              avgScore = validScores.length > 0 ? Math.round(validScores.reduce((a, b) => a + b, 0) / validScores.length) : null;
              lastDate = results[0].submitted_at;
            }
          }

          let level: StandardProgress['mastery_level'] = 'not_started';
          if (assessmentIds.length === 1) level = 'introduced';
          else if (assessmentIds.length > 1) {
            if (avgScore && avgScore >= 90) level = 'mastered';
            else if (avgScore && avgScore >= 80) level = 'proficient';
            else level = 'practicing';
          }

          return {
            id: standard.id,
            standard_code: standard.standard_code,
            statement: standard.statement || standard.description || 'No description available',
            subject: standard.subject,
            grade_level: standard.grade_level,
            category: standard.category || 'General',
            lesson_count: lessonCount || 0,
            assessment_count: assessmentIds.length,
            avg_score: avgScore,
            last_assessed: lastDate,
            mastery_level: level
          };
        })
      );

      let filtered = progressData;
      if (selectedSubject !== 'all') filtered = filtered.filter(s => s.subject === selectedSubject);
      if (selectedMastery !== 'all') filtered = filtered.filter(s => s.mastery_level === selectedMastery);
      filtered.sort((a, b) => a.standard_code.localeCompare(b.standard_code));
      setStandards(filtered as any[]);
    } catch (error: any) {
      console.error('Error loading standards progress:', error.message || error);
    } finally {
      setLoading(false);
    }
  };

  const getMasteryBadge = (level: string) => {
    const badges: any = {
      not_started: { label: '⭕ Not Started', bg: 'bg-slate-100', text: 'text-slate-700' },
      introduced: { label: '🔵 Introduced', bg: 'bg-blue-100', text: 'text-blue-700' },
      practicing: { label: '🟡 Practicing', bg: 'bg-amber-100', text: 'text-amber-800' },
      proficient: { label: '🟢 Proficient', bg: 'bg-green-100', text: 'text-green-800' },
      mastered: { label: '✓ Mastered', bg: 'bg-emerald-100', text: 'text-emerald-900' }
    };
    return badges[level] || badges.not_started;
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50 text-slate-900 font-bold">Loading standards...</div>;

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* 1. MATCHING PURPLE HEADER */}
      <div className="bg-gradient-to-r from-purple-800 to-indigo-900 pb-32 pt-12 px-8">
        <div className="max-w-7xl mx-auto">
          <button onClick={() => router.push('/dashboard')} className="text-white/80 mb-2 block hover:text-white transition-colors text-sm font-bold">
            ← Back to Dashboard
          </button>
          <h1 className="text-4xl font-black text-white tracking-tight">Standards Tracking</h1>
          <p className="text-white/90 mt-2 font-semibold">Monitor academic progress and mastery across all subjects.</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-8 -mt-24">
        {/* 2. STATS SUMMARY (HIGH CONTRAST) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-2xl shadow-md border border-slate-200">
            <p className="text-xs font-black text-slate-500 uppercase tracking-widest">Total Standards</p>
            <p className="text-3xl font-black text-slate-900">{standards.length}</p>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-md border-l-4 border-l-emerald-500">
            <p className="text-xs font-black text-slate-500 uppercase tracking-widest">Mastered</p>
            <p className="text-3xl font-black text-emerald-900">{standards.filter(s => s.mastery_level === 'mastered').length}</p>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-md border-l-4 border-l-blue-500">
            <p className="text-xs font-black text-slate-500 uppercase tracking-widest">Introduced</p>
            <p className="text-3xl font-black text-blue-900">{standards.filter(s => s.mastery_level === 'introduced').length}</p>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-md border border-slate-200">
            <p className="text-xs font-black text-slate-500 uppercase tracking-widest">Not Started</p>
            <p className="text-3xl font-black text-slate-400">{standards.filter(s => s.mastery_level === 'not_started').length}</p>
          </div>
        </div>

        {/* 3. FILTERS (DARK TEXT) */}
        <div className="bg-white p-6 rounded-2xl shadow-md mb-8 grid grid-cols-1 md:grid-cols-3 gap-6 border border-slate-200">
          <div>
            <label className="block text-xs font-black text-slate-900 mb-2 uppercase">Student</label>
            <select value={selectedKid} onChange={(e) => setSelectedKid(e.target.value)} className="w-full p-3 bg-slate-50 border-2 border-slate-200 rounded-xl text-slate-900 font-bold outline-none focus:border-purple-600">
              <option value="all">All Students</option>
              {kids.map(k => <option key={k.id} value={k.id}>{k.displayname}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-black text-slate-900 mb-2 uppercase">Subject</label>
            <select value={selectedSubject} onChange={(e) => setSelectedSubject(e.target.value)} className="w-full p-3 bg-slate-50 border-2 border-slate-200 rounded-xl text-slate-900 font-bold outline-none focus:border-purple-600">
              <option value="all">All Subjects</option>
              {Array.from(new Set(standards.map(s => s.subject))).map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-black text-slate-900 mb-2 uppercase">Mastery</label>
            <select value={selectedMastery} onChange={(e) => setSelectedMastery(e.target.value)} className="w-full p-3 bg-slate-50 border-2 border-slate-200 rounded-xl text-slate-900 font-bold outline-none focus:border-purple-600">
              <option value="all">All Mastery Levels</option>
              <option value="not_started">Not Started</option>
              <option value="mastered">Mastered</option>
            </select>
          </div>
        </div>

        {/* 4. LIST (DARK TEXT) */}
        <div className="space-y-4 pb-20">
          {standards.map(std => {
            const badge = getMasteryBadge(std.mastery_level);
            return (
              <div key={std.id} className="bg-white p-8 rounded-2xl shadow-md border border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center hover:bg-slate-50 transition-colors">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-[11px] font-black bg-slate-900 text-white px-3 py-1 rounded-md tracking-wider">{std.standard_code}</span>
                    <span className={`text-xs font-black px-3 py-1 rounded-full ${badge.bg} ${badge.text} border border-current/10`}>{badge.label}</span>
                  </div>
                  <p className="text-lg font-black text-slate-900 leading-tight">{std.statement}</p>
                  <p className="text-sm font-bold text-slate-500 mt-1 uppercase tracking-wide">{std.subject} • {std.category}</p>
                </div>
                <div className="mt-4 md:mt-0 text-right md:min-w-[150px]">
                  <div className="inline-block bg-slate-50 border border-slate-100 rounded-xl p-3">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Activity</p>
                    <p className="text-sm font-black text-slate-800">📚 {std.lesson_count} Lessons</p>
                    <p className="text-sm font-black text-slate-800">📝 {std.assessment_count} Assessments</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
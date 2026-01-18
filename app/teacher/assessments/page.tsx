'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

interface StandardProgress {
  id: string;
  standard_code: string;
  statement: string; // Changed from standard_description to match typical schemas
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
      if (!user) { router.push('/login'); return; }

      const { data: settings } = await supabase
        .from('school_year_settings')
        .select('organization_id')
        .eq('user_id', user.id)
        .maybeSingle();

      setOrganizationId(settings?.organization_id || user.id);

      const { data: kidsData } = await supabase
        .from('kids')
        .select('id, displayname')
        .order('displayname');

      if (kidsData) setKids(kidsData);
    } catch (error) {
      console.error('Error loading initial data:', error);
    }
  };

  const loadStandardsProgress = async () => {
    if (!organizationId) return;
    setLoading(true);

    try {
      // 1. Fetch standards - Using '*' to avoid column name errors, 
      // then we will map it safely in Step 2.
      const { data: userStandards, error: standardsError } = await supabase
        .from('user_standards')
        .select('*') 
        .eq('organization_id', organizationId);

      if (standardsError) throw standardsError;
      if (!userStandards) { setStandards([]); return; }

      // 2. Process metrics for each standard
      const progressData = await Promise.all(
        userStandards.map(async (standard: any) => {
          // Count lessons
          const { count: lessonCount } = await supabase
            .from('lessons')
            .select('*', { count: 'exact', head: true })
            .eq('subject', standard.subject)
            .in('kid_id', selectedKid === 'all' ? kids.map(k => k.id) : [selectedKid]);

          // Get assessment links
          const { data: assessmentLinks } = await supabase
            .from('assessment_standards')
            .select(`
              assessment_id,
              assessments!inner(
                id,
                lesson_id,
                lessons!inner(kid_id)
              )
            `)
            .eq('user_standard_id', standard.id);

            let filteredLinks = (assessmentLinks || []) as any[];
          
            if (selectedKid !== 'all') {
              filteredLinks = filteredLinks.filter(
                l => l.assessments?.lessons?.kid_id === selectedKid
              );
            }

          const assessmentIds = filteredLinks.map(l => l.assessment_id);
          let avgScore: number | null = null;
          let lastDate: string | null = null;

          if (assessmentIds.length > 0) {
            const { data: results } = await supabase
              .from('assessment_results')
              .select('auto_score, submitted_at')
              .in('assessment_id', assessmentIds)
              .not('auto_score', 'is', null)
              .order('submitted_at', { ascending: false });

            if (results && results.length > 0) {
              const validScores = results.map(r => r.auto_score).filter(s => s !== null);
              avgScore = validScores.length > 0 ? Math.round(validScores.reduce((a, b) => a + b, 0) / validScores.length) : null;
              lastDate = results[0].submitted_at;
            }
          }

          // Mastery Logic
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
            // SAFE FALLBACK: Checks for 'statement' or 'description' columns
            statement: standard.statement || standard.description || standard.standard_description || 'No description available',
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

      // 3. Filters
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
      not_started: { label: '⭕ Not Started', bg: 'bg-gray-100', text: 'text-gray-700' },
      introduced: { label: '🔵 Introduced', bg: 'bg-blue-100', text: 'text-blue-700' },
      practicing: { label: '🟡 Practicing', bg: 'bg-yellow-100', text: 'text-yellow-700' },
      proficient: { label: '🟢 Proficient', bg: 'bg-green-100', text: 'text-green-700' },
      mastered: { label: '✓ Mastered', bg: 'bg-emerald-100', text: 'text-emerald-700' }
    };
    return badges[level] || badges.not_started;
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50">Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-8 text-black">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8">
          <button onClick={() => router.push('/dashboard')} className="text-gray-500 hover:text-black mb-4 flex items-center gap-2">〈 Back</button>
          <h1 className="text-3xl font-bold">Standards Tracking</h1>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white p-6 rounded-xl shadow-sm border">
            <p className="text-xs font-bold text-gray-400 uppercase">Total</p>
            <p className="text-2xl font-bold">{standards.length}</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-l-4 border-l-emerald-500">
            <p className="text-xs font-bold text-gray-400 uppercase">Mastered</p>
            <p className="text-2xl font-bold">{standards.filter(s => s.mastery_level === 'mastered').length}</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-l-4 border-l-blue-500">
            <p className="text-xs font-bold text-gray-400 uppercase">Introduced</p>
            <p className="text-2xl font-bold">{standards.filter(s => s.mastery_level === 'introduced').length}</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border">
            <p className="text-xs font-bold text-gray-400 uppercase">Not Started</p>
            <p className="text-2xl font-bold">{standards.filter(s => s.mastery_level === 'not_started').length}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm mb-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <select value={selectedKid} onChange={(e) => setSelectedKid(e.target.value)} className="p-2 border rounded">
            <option value="all">All Students</option>
            {kids.map(k => <option key={k.id} value={k.id}>{k.displayname}</option>)}
          </select>
          <select value={selectedSubject} onChange={(e) => setSelectedSubject(e.target.value)} className="p-2 border rounded">
            <option value="all">All Subjects</option>
            {Array.from(new Set(standards.map(s => s.subject))).map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={selectedMastery} onChange={(e) => setSelectedMastery(e.target.value)} className="p-2 border rounded">
            <option value="all">All Mastery Levels</option>
            <option value="not_started">Not Started</option>
            <option value="mastered">Mastered</option>
          </select>
        </div>

        <div className="space-y-4">
          {standards.map(std => {
            const badge = getMasteryBadge(std.mastery_level);
            return (
              <div key={std.id} className="bg-white p-6 rounded-xl shadow-sm border flex justify-between items-center">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-[10px] font-bold bg-gray-100 px-2 py-1 rounded">{std.standard_code}</span>
                    <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${badge.bg} ${badge.text}`}>{badge.label}</span>
                  </div>
                  <p className="font-medium text-gray-800">{std.statement}</p>
                </div>
                <div className="text-right text-xs font-bold text-gray-400">
                  <p>Lessons: {std.lesson_count}</p>
                  <p>Assessments: {std.assessment_count}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
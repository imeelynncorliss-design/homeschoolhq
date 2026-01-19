'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

interface PlanningTask {
  id: string;
  task_label: string;
  task_category: string;
  is_completed: boolean;
  completed_at?: string;
}

export default function PlanningModeDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [currentPeriod, setCurrentPeriod] = useState<any>(null);
  const [tasks, setTasks] = useState<PlanningTask[]>([]);
  const [lastSynced, setLastSynced] = useState<string>(new Date().toLocaleTimeString());
  
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [tempTitle, setTempTitle] = useState('');
  const [isEditingGoals, setIsEditingGoals] = useState(false);
  const [goalsText, setGoalsText] = useState('');
  
  const [showHistory, setShowHistory] = useState(false);
  const [historicalGoals, setHistoricalGoals] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadPlanningData();
  }, []);

  
  const [user, setUser] = useState<any>(null);
  
  const loadPlanningData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        // 1. Dev Bypass for localhost
        if (window.location.hostname === 'localhost') {
          console.warn("🛠️ Dev Bypass: Staying on page");
          setUser({ id: 'dev-user', email: 'dev@example.com' });
          
          // Provide mock data so cards and titles appear during testing
          setCurrentPeriod({ 
            id: 'mock-id',
            period_name: 'Summer Prep 2026', 
            goals: 'Get organized for the fall!' 
          });
          setTasks([
            { id: '1', task_label: 'Review Curriculum', task_category: 'curriculum', is_completed: false },
            { id: '2', task_label: 'Set Grading Scale', task_category: 'assessment', is_completed: false }
          ]);
          
          setLoading(false);
          return;
        }
        
        // 2. Redirect if not on localhost
        router.push('/'); 
        return;
      }

      // Standard Data Fetching
      const { data: periodData } = await supabase
        .from('planning_periods')
        .select('*')
        .eq('is_active', true)
        .maybeSingle();

      if (periodData) {
        setCurrentPeriod(periodData);
        setTempTitle(periodData.period_name);
        setGoalsText(periodData.goals || '');
        
        const { data: tasksData } = await supabase
          .from('planning_tasks')
          .select('*')
          .eq('planning_period_id', periodData.id)
          .order('task_category', { ascending: true });
        setTasks(tasksData || []);

        const { data: historyData } = await supabase
          .from('planning_periods')
          .select('period_name, goals, end_date')
          .eq('is_active', false)
          .order('end_date', { ascending: false });
        setHistoricalGoals(historyData || []);
      }
    } catch (error) { 
      console.error("Dashboard Load Error:", error); 
    } finally { 
      setLoading(false); 
    }
  };

  const handleUpdateTitle = async () => {
    if (!tempTitle.trim()) return;
    const { error } = await supabase.from('planning_periods').update({ period_name: tempTitle }).eq('id', currentPeriod.id);
    if (!error) {
      setCurrentPeriod({ ...currentPeriod, period_name: tempTitle });
      setIsEditingTitle(false);
      setLastSynced(new Date().toLocaleTimeString());
    }
  };

  const handleSaveGoals = async () => {
    // 1. DEV BYPASS: If we are testing with a mock ID, just update the UI
    if (currentPeriod?.id === 'mock-id' || currentPeriod?.id === '00000000-0000-0000-0000-000000000000') {
      console.warn("🛠️ Dev Bypass: Saving goals locally for testing");
      setIsEditingGoals(false);
      setCurrentPeriod({ ...currentPeriod, goals: goalsText });
      setLastSynced(new Date().toLocaleTimeString());
      return;
    }

    // 2. REAL DATABASE LOGIC
    const { error } = await supabase
      .from('planning_periods')
      .update({ goals: goalsText })
      .eq('id', currentPeriod.id);

    if (!error) {
      setIsEditingGoals(false);
      // Ensure the local state is updated so the new text shows up immediately
      setCurrentPeriod({ ...currentPeriod, goals: goalsText });
      setLastSynced(new Date().toLocaleTimeString());
    } else {
      console.error("Error saving goals:", error.message);
      // Optional: alert the user or show a toast
    }
  };

  const toggleTaskComplete = async (taskId: string, currentStatus: boolean) => {
    const { error } = await supabase.from('planning_tasks').update({ is_completed: !currentStatus }).eq('id', taskId);
    if (!error) {
      setTasks(tasks.map(t => t.id === taskId ? { ...t, is_completed: !currentStatus } : t));
      setLastSynced(new Date().toLocaleTimeString());
    }
  };

  const filteredHistory = historicalGoals.filter(h => 
    h.period_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (h.goals && h.goals.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const tasksByCategory = tasks.reduce((acc, task) => {
    if (!acc[task.task_category]) acc[task.task_category] = [];
    acc[task.task_category].push(task);
    return acc;
  }, {} as Record<string, PlanningTask[]>);

  const categoryInfo: Record<string, { icon: string; label: string; route: string }> = {
    curriculum: { icon: '📚', label: 'Curriculum & Standards', route: '/dashboard?action=import' },
    students: { icon: '👥', label: 'Student Profiles', route: '/dashboard?action=students' },
    schedule: { icon: '📅', label: 'Schedule & Calendar', route: '/dashboard?action=schedule' },
    assessment: { icon: '📊', label: 'Assessment & Evaluation', route: '/teacher/assessments' },
    materials: { icon: '📦', label: 'Materials & Resources', route: '/materials' },
    goals: { icon: '🎯', label: 'Goals & Priorities', route: '#goals' }
  };

  const completedTasks = tasks.filter(t => t.is_completed).length;
  const totalTasks = tasks.length;
  const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  if (loading) return <div className="min-h-screen bg-black flex items-center justify-center text-white">Loading...</div>;

  return (
    <div className="max-w-7xl mx-auto p-6 bg-gray-50 min-h-screen text-gray-900">
      {/* Mini Header */}
      <div className="flex justify-between items-center mb-4">
        <button onClick={() => router.push('/admin')} className="text-gray-400 text-xs font-bold uppercase tracking-widest hover:text-white transition-all">
          〈 Back to Admin
        </button>
        <div className="text-[10px] text-gray-600 uppercase tracking-widest bg-gray-200/50 px-3 py-1 rounded-full border border-gray-300">
          Cloud Sync: {lastSynced}
        </div>
      </div>

      {/* Hero Banner - Original Height Restored */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-8 mb-6 shadow-lg border border-white/10 text-white">
        <div className="flex justify-between items-start mb-6">
          <div className="flex-1">
            {isEditingTitle ? (
              <input 
                value={tempTitle}
                onChange={(e) => setTempTitle(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleUpdateTitle()}
                className="bg-white/10 border border-white/20 text-4xl font-bold rounded px-2 outline-none w-full max-w-lg text-white"
                autoFocus
                onBlur={handleUpdateTitle}
              />
            ) : (
              <h1 onClick={() => setIsEditingTitle(true)} className="text-4xl font-bold mb-2 cursor-pointer hover:opacity-80 flex items-center gap-3 text-white">
                {currentPeriod?.period_name} <span className="text-lg opacity-60">✎</span>
              </h1>
            )}
            <p className="text-white/90 text-sm">Summer is prime planning season! Get organized now so you can start strong in the fall.</p>
          </div>
          <div className="text-right text-sm text-white">
            <div className="font-bold text-lg">29 days remaining</div>
            <div className="opacity-80 tracking-tighter uppercase text-[10px]">1/9/2026 - 2/15/2026</div>
          </div>
        </div>
        <div className="w-full bg-white/20 rounded-full h-2.5 mb-4 overflow-hidden">
          <div className="bg-white h-full transition-all duration-700" style={{ width: `${progressPercent}%` }} />
        </div>
        <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-white">
          <span>{completedTasks} / {totalTasks} tasks complete ({progressPercent}%)</span>
          <span className="flex items-center gap-1.5 text-white/90">⏱ ~4 hours remaining</span>
        </div>
      </div>

      {/* Goals Card - Search Bar Fixed Visibility */}
      <div className="bg-white rounded-xl shadow-md p-6 mb-8 border border-gray-100 text-black">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-3 font-bold">
            <span className="text-xl">🎯</span>
            <h2 className="uppercase tracking-tight text-sm">Session Goals & Big Picture</h2>
          </div>
          <div className="flex gap-4 items-center">
            <button onClick={() => setShowHistory(!showHistory)} className="text-[10px] font-black uppercase text-gray-400 hover:text-blue-600">
              {showHistory ? '✕ Close History' : '📜 View History'}
            </button>
            {!isEditingGoals && (
              <button onClick={() => setIsEditingGoals(true)} className="text-[10px] font-black text-blue-600 uppercase">
                ✏️ Edit Goals
              </button>
            )}
          </div>
        </div>

        {showHistory && (
          <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex items-center gap-2 bg-white p-2 rounded border border-gray-200 mb-3">
              <span className="text-gray-400">🔍</span>
              <input 
                type="text"
                placeholder="Search history..."
                className="w-full text-xs outline-none"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="space-y-2 max-h-40 overflow-y-auto pr-2">
              {filteredHistory.map((hist, i) => (
                <div key={i} className="p-3 bg-white rounded border-l-4 border-blue-500 shadow-sm">
                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{hist.period_name}</p>
                  <p className="text-xs text-gray-700 italic">"{hist.goals}"</p>
                </div>
              ))}
              {filteredHistory.length === 0 && <p className="text-[10px] text-center text-gray-400 py-2">No history found.</p>}
            </div>
          </div>
        )}

        {isEditingGoals ? (
          <div className="space-y-4">
            <textarea
              value={goalsText}
              onChange={(e) => setGoalsText(e.target.value)}
              className="w-full p-4 rounded-xl border border-gray-200 text-sm focus:border-blue-500 outline-none"
              rows={3}
            />
            <div className="flex justify-end gap-3">
              <button onClick={() => setIsEditingGoals(false)} className="text-xs font-bold text-gray-400">Cancel</button>
              <button onClick={handleSaveGoals} className="px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-lg shadow-md">Save Goals</button>
            </div>
          </div>
        ) : (
          <div className="p-4 bg-blue-50/50 rounded-lg border border-blue-100 text-sm text-gray-700 leading-relaxed italic">
            {goalsText || "Set your goals for this session..."}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          {Object.entries(tasksByCategory).map(([category, categoryTasks]) => {
            const info = categoryInfo[category] || { 
              icon: '📋', 
              label: category.charAt(0).toUpperCase() + category.slice(1), 
              route: '#' 
            };
            
            return (
              <div key={category} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden text-black">
                <div className="p-4 border-b border-gray-50 flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{info.icon}</span>
                    <h3 className="font-bold text-[13px] uppercase tracking-tight">{info.label}</h3>
                  </div>
                  <button onClick={() => router.push(info.route)} className="text-[10px] font-black text-blue-600 uppercase">Manage →</button>
                </div>
                <div className="divide-y divide-gray-50">
                  {categoryTasks.map((task) => (
                    <label key={task.id} className="p-4 flex items-center gap-4 hover:bg-gray-50 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={task.is_completed} 
                        onChange={() => toggleTaskComplete(task.id, task.is_completed)} 
                        className="w-4 h-4 rounded border-gray-300 text-blue-600" 
                      />
                      <span className={`text-sm font-medium ${task.is_completed ? 'line-through text-gray-300' : 'text-gray-700'}`}>
                        {task.task_label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Sidebar - RESTORED ELEMENTS */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 text-black">
            <h3 className="text-[10px] font-black text-gray-400 mb-4 uppercase tracking-widest">Master Tools</h3>
            <div className="space-y-3">
              <button onClick={() => router.push('/dashboard?action=import')} className="w-full flex items-center gap-3 p-3 rounded-lg bg-blue-50 hover:bg-blue-100 border border-blue-100 text-left transition-all">
                <span className="text-xl">📚</span>
                <span className="text-xs font-bold text-blue-900 uppercase tracking-tighter">Curriculum Import</span>
              </button>
              <button onClick={() => router.push('/teacher/assessments')} className="w-full flex items-center gap-3 p-3 rounded-lg bg-green-50 hover:bg-green-100 border border-green-100 text-left transition-all">
                <span className="text-xl">📊</span>
                <span className="text-xs font-bold text-green-900 uppercase tracking-tighter">Set Up Assessments</span>
              </button>
              <button onClick={() => router.push('/materials')} className="w-full flex items-center gap-3 p-3 rounded-lg bg-orange-50 hover:bg-orange-100 border border-orange-100 text-left transition-all">
                <span className="text-xl">📦</span>
                <span className="text-xs font-bold text-orange-900 uppercase tracking-tighter">Materials List</span>
              </button>
            </div>
          </div>

          {/* Updated Planning Tip Card - Light Mode */}
          <div className="bg-blue-50 rounded-xl p-6 border border-blue-100 shadow-sm">
            <h3 className="text-[10px] font-black text-blue-600 mb-3 uppercase tracking-widest">💡 Planning Tip</h3>
            <p className="text-[11px] text-blue-900 leading-relaxed font-semibold">
              Start with the curriculum first. Once you know <span className="text-blue-700 underline decoration-blue-200">what</span> you are teaching, the calendar and materials fall into place much easier.
            </p>
          </div>

          <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm text-black">
            <h3 className="text-[10px] font-black text-gray-400 mb-3 uppercase tracking-widest">FAQ</h3>
            <div className="space-y-3">
              <div className="group">
                <p className="text-[11px] font-bold text-gray-800">What is Planning Mode?</p>
                <p className="text-[10px] text-gray-500 hidden group-hover:block transition-all">A focused environment for future prep without current semester noise.</p>
              </div>
            </div>
          </div>
          
          <button onClick={() => window.print()} className="w-full bg-white text-gray-900 font-black py-4 rounded-xl shadow-lg border border-gray-100 text-[10px] uppercase tracking-widest hover:bg-gray-50 active:scale-95 transition-all">
            📥 Export Report
          </button>
        </div>
      </div>
    </div>
  );
}
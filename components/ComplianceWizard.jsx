import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  ChevronRight, 
  MapPin, 
  User, 
  CheckCircle2, 
  AlertCircle,
  ArrowLeft,
  Clock,
  Calendar,
  RefreshCw
} from 'lucide-react';

/**
 * COMPLIANCE WIZARD
 * * Systematic Step 1: Linking kids to state targets.
 * * NOTE: The '@supabase/supabase-js' import has been removed to resolve build errors 
 * in this environment. This component now expects a pre-initialized 'supabase' 
 * client passed in via props, which is the standard best practice for shared components.
 */

export default function ComplianceWizard({ supabase, onComplete }) {
  const [step, setStep] = useState(1);
  const [kids, setKids] = useState([]);
  const [targets, setTargets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Selections
  const [selectedKid, setSelectedKid] = useState(null);
  const [selectedTarget, setSelectedTarget] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  // 1. Fetch your existing kids and the new state targets
  useEffect(() => {
    async function fetchData() {
      // Check if supabase client exists
      if (!supabase) {
        setError("Supabase configuration missing. Please ensure your Supabase client is passed to this component.");
        setLoading(false);
        return;
      }

      try {
        setError(null);
        setLoading(true);
        
        // Fetch kids and targets in parallel
        const [kidsRes, targetsRes] = await Promise.all([
          supabase.from('kids').select('*'),
          supabase.from('state_compliance_targets').select('*')
        ]);
        
        if (kidsRes.error) throw kidsRes.error;
        if (targetsRes.error) throw targetsRes.error;

        setKids(kidsRes.data || []);
        setTargets(targetsRes.data || []);
      } catch (err) {
        console.error("Error loading setup data:", err);
        setError("Failed to load data from Supabase. Check your table permissions and internet connection.");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [supabase]);

  const handleSave = async () => {
    if (!selectedKid || !selectedTarget || !supabase) return;

    setIsSaving(true);
    try {
      const { error: saveError } = await supabase
        .from('student_compliance_profiles')
        .insert([
          {
            kid_id: selectedKid.id,
            target_id: selectedTarget.id,
            confirmed_by_parent: true
          }
        ]);
      
      if (!saveError) {
        setStep(3);
        if (onComplete) onComplete();
      } else {
        throw saveError;
      }
    } catch (err) {
      console.error("Save failed:", err);
      setError("Could not save compliance profile. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  // Error State UI
  if (error) {
    return (
      <div className="max-w-2xl mx-auto bg-white rounded-[2.5rem] shadow-xl border border-red-100 overflow-hidden mt-10 p-10 text-center">
        <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertCircle size={32} />
        </div>
        <h3 className="text-xl font-bold text-slate-800 mb-2">Connection Required</h3>
        <p className="text-slate-500 text-sm mb-6 leading-relaxed">
          {error}
        </p>
        <button 
          onClick={() => window.location.reload()}
          className="bg-slate-900 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 mx-auto transition-transform active:scale-95"
        >
          <RefreshCw size={18} /> Retry Connection
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-20 space-y-4">
        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="font-black text-slate-400 uppercase tracking-widest text-xs">Syncing Family Data...</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto bg-white rounded-[2.5rem] shadow-xl border border-slate-100 overflow-hidden mt-10">
      {/* Header */}
      <div className="bg-indigo-600 p-8 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-10">
          <ShieldCheck size={120} />
        </div>
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <ShieldCheck size={28} className="text-indigo-200" />
            <h2 className="text-2xl font-black italic">Compliance Wizard</h2>
          </div>
          <p className="text-indigo-100 text-sm font-medium">Link your children to state-mandated requirements.</p>
        </div>
      </div>

      <div className="p-8">
        {/* Step 1: Select Kid */}
        {step === 1 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <span className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center text-[10px] font-black">01</span>
              Select Student
            </h3>
            <div className="grid grid-cols-1 gap-3">
              {kids.length > 0 ? (
                kids.map(kid => (
                  <button 
                    key={kid.id}
                    onClick={() => setSelectedKid(kid)}
                    className={`flex items-center gap-4 p-5 rounded-2xl border-2 transition-all text-left ${selectedKid?.id === kid.id ? 'border-indigo-600 bg-indigo-50 shadow-sm' : 'border-slate-50 hover:border-slate-200'}`}
                  >
                    <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center font-black text-slate-400 overflow-hidden border border-slate-200">
                      {kid.photo_url ? (
                        <img src={kid.photo_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        kid.firstname?.[0] || <User size={24} />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="font-black text-slate-800 text-lg leading-tight">{kid.firstname} {kid.lastname}</p>
                      <p className="text-xs text-slate-400 font-bold uppercase tracking-tight">{kid.grade || 'No Grade Assigned'}</p>
                    </div>
                    {selectedKid?.id === kid.id && (
                      <div className="bg-indigo-600 p-1.5 rounded-full text-white">
                        <CheckCircle2 size={18} />
                      </div>
                    )}
                  </button>
                ))
              ) : (
                <div className="p-12 text-center border-2 border-dashed border-slate-100 rounded-[2rem]">
                  <User className="mx-auto text-slate-200 mb-2" size={40} />
                  <p className="text-sm font-bold text-slate-400">No student profiles found.</p>
                </div>
              )}
            </div>
            <button 
              disabled={!selectedKid}
              onClick={() => setStep(2)}
              className="w-full bg-slate-900 text-white py-5 rounded-[1.5rem] font-black disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-3 transition-all hover:bg-slate-800 active:scale-[0.98] shadow-lg shadow-slate-200"
            >
              Continue to Requirements <ChevronRight size={20} />
            </button>
          </div>
        )}

        {/* Step 2: Select State Target */}
        {step === 2 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-2">
            <button onClick={() => setStep(1)} className="text-slate-400 flex items-center gap-1 text-xs font-black uppercase tracking-widest hover:text-slate-600 transition-colors">
              <ArrowLeft size={14} /> Back to Kids
            </button>
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <span className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center text-[10px] font-black">02</span>
              State Mandate Selection
            </h3>
            <div className="grid grid-cols-1 gap-3">
              {targets.map(target => (
                <button 
                  key={target.id}
                  onClick={() => setSelectedTarget(target)}
                  className={`p-6 rounded-[2rem] border-2 transition-all text-left ${selectedTarget?.id === target.id ? 'border-indigo-600 bg-indigo-50 shadow-sm' : 'border-slate-50 hover:border-slate-200'}`}
                >
                  <div className="flex justify-between items-center mb-4">
                    <span className="bg-indigo-600 text-white px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-[0.2em]">{target.state_code}</span>
                    <span className="text-xs font-black text-slate-400 uppercase tracking-tighter italic">Grades {target.grade_level}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-indigo-100 rounded-lg text-indigo-600">
                        <Clock size={18} />
                      </div>
                      <div>
                        <p className="text-[10px] uppercase text-slate-400 font-black leading-none mb-1">Annual Hours</p>
                        <p className="text-lg font-black text-slate-800 tracking-tight">{target.required_annual_hours}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-indigo-100 rounded-lg text-indigo-600">
                        <Calendar size={18} />
                      </div>
                      <div>
                        <p className="text-[10px] uppercase text-slate-400 font-black leading-none mb-1">Annual Days</p>
                        <p className="text-lg font-black text-slate-800 tracking-tight">{target.required_annual_days}</p>
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
            <div className="bg-amber-50 p-5 rounded-2xl border border-amber-100 flex gap-4">
              <AlertCircle className="text-amber-500 shrink-0" size={24} />
              <p className="text-[11px] text-amber-800 leading-relaxed font-bold italic">
                By confirming, you authorize Sync-School to generate legal audit logs for {selectedKid?.firstname} based on {selectedTarget?.state_code} mandates.
              </p>
            </div>
            <button 
              disabled={!selectedTarget || isSaving}
              onClick={handleSave}
              className="w-full bg-indigo-600 text-white py-5 rounded-[1.5rem] font-black shadow-xl shadow-indigo-100 flex items-center justify-center gap-3 transition-all hover:bg-indigo-700 active:scale-[0.98]"
            >
              {isSaving ? 'Establishing Shield...' : 'Activate Compliance Tracking'}
            </button>
          </div>
        )}

        {/* Step 3: Success */}
        {step === 3 && (
          <div className="text-center py-12 space-y-8 animate-in zoom-in duration-500">
            <div className="relative inline-block">
              <div className="w-24 h-24 bg-green-100 text-green-600 rounded-3xl mx-auto flex items-center justify-center shadow-xl rotate-3">
                <CheckCircle2 size={48} />
              </div>
              <div className="absolute -top-2 -right-2 w-8 h-8 bg-indigo-600 text-white rounded-full flex items-center justify-center border-4 border-white">
                <ShieldCheck size={16} />
              </div>
            </div>
            <div>
              <h3 className="text-3xl font-black text-slate-800 tracking-tighter">System Engaged</h3>
              <p className="text-slate-500 text-sm mt-3 max-w-[320px] mx-auto leading-relaxed font-medium">
                {selectedKid?.firstname}'s education journey is now officially synced with {selectedTarget?.state_code} state law.
              </p>
            </div>
            <div className="pt-4 flex flex-col gap-3 max-w-sm mx-auto">
              <button 
                onClick={() => window.location.reload()} 
                className="bg-slate-900 text-white py-5 rounded-2xl font-black shadow-lg transition-all active:scale-95 hover:bg-slate-800 uppercase tracking-widest text-xs"
              >
                Go to Smart Dashboard
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
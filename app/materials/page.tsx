'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

type MaterialType = 'textbook' | 'subscription' | 'physical' | 'digital';

interface Material {
  id: string;
  material_type: MaterialType;
  name: string;
  subject?: string;
  grade_level?: string;
  publisher?: string;
  quantity?: number;
  condition?: string;
  url?: string;
  login_info?: string;
  license_expires?: string;
  notes?: string;
  created_at: string;
}

export default function MaterialsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<MaterialType | 'all'>('all');
  const [filterSubject, setFilterSubject] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Form state
  const [formType, setFormType] = useState<MaterialType>('textbook');
  const [formName, setFormName] = useState('');
  const [formSubject, setFormSubject] = useState('');
  const [formGrade, setFormGrade] = useState('');
  const [formPublisher, setFormPublisher] = useState('');
  const [formQuantity, setFormQuantity] = useState(1);
  const [formCondition, setFormCondition] = useState('');
  const [formUrl, setFormUrl] = useState('');
  const [formLoginInfo, setFormLoginInfo] = useState('');
  const [formLicenseExpires, setFormLicenseExpires] = useState('');
  const [formNotes, setFormNotes] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (organizationId) {
      loadMaterials();
    }
  }, [organizationId, filterType, filterSubject, searchQuery]);

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user && window.location.hostname === 'localhost') {
        setOrganizationId('00000000-0000-0000-0000-000000000000');
        setLoading(false);
        return;
      }
      if (!user) { router.push('/'); return; }
      const { data: settings } = await supabase.from('school_year_settings').select('organization_id').eq('user_id', user.id).maybeSingle();
      setOrganizationId(settings?.organization_id || user.id);
    } catch (error) { console.error('Error loading data:', error); }
  };

  const loadMaterials = async () => {
    if (organizationId === '00000000-0000-0000-0000-000000000000') {
      setLoading(true);
      let savedMaterials = JSON.parse(sessionStorage.getItem('dev_materials') || '[]');
      let filtered = [...savedMaterials];
      if (filterType !== 'all') filtered = filtered.filter((m: any) => m.material_type === filterType);
      if (filterSubject !== 'all') filtered = filtered.filter((m: any) => m.subject === filterSubject);
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        filtered = filtered.filter((m: any) => 
          m.name.toLowerCase().includes(q) || (m.subject && m.subject.toLowerCase().includes(q))
        );
      }
      setMaterials(filtered);
      setLoading(false);
      return;
    }

    if (!organizationId) return;
    setLoading(true);
    try {
      let query = supabase.from('materials').select('*').eq('organization_id', organizationId).order('created_at', { ascending: false });
      if (filterType !== 'all') query = query.eq('material_type', filterType);
      if (filterSubject !== 'all') query = query.eq('subject', filterSubject);
      if (searchQuery) query = query.ilike('name', `%${searchQuery}%`);
      const { data, error } = await query;
      if (error) throw error;
      setMaterials(data || []);
    } catch (error) { console.error('Error loading materials:', error); } finally { setLoading(false); }
  };

  const resetForm = () => {
    setFormType('textbook'); setFormName(''); setFormSubject(''); setFormGrade('');
    setFormPublisher(''); setFormQuantity(1); setFormCondition(''); setFormUrl('');
    setFormLoginInfo(''); setFormLicenseExpires(''); setFormNotes('');
    setEditingMaterial(null);
  };

  const openAddForm = () => { resetForm(); setShowAddForm(true); };

  const openEditForm = (material: Material) => {
    setEditingMaterial(material);
    setFormType(material.material_type);
    setFormName(material.name);
    setFormSubject(material.subject || '');
    setFormGrade(material.grade_level || '');
    setFormPublisher(material.publisher || '');
    setFormQuantity(material.quantity || 1);
    setFormCondition(material.condition || '');
    setFormUrl(material.url || '');
    setFormLoginInfo(material.login_info || '');
    setFormLicenseExpires(material.license_expires || '');
    setFormNotes(material.notes || '');
    setShowAddForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organizationId) return;
    const materialData = {
      organization_id: organizationId,
      material_type: formType,
      name: formName,
      subject: formSubject || null,
      grade_level: formGrade || null,
      publisher: formPublisher || null,
      quantity: formQuantity,
      condition: formCondition || null,
      url: formUrl || null,
      login_info: formLoginInfo || null,
      license_expires: formLicenseExpires || null,
      notes: formNotes || null,
    };

    try {
      if (organizationId === '00000000-0000-0000-0000-000000000000') {
        const existing = JSON.parse(sessionStorage.getItem('dev_materials') || '[]');
        const newItem = { 
          ...materialData, 
          id: editingMaterial ? editingMaterial.id : `dev-${Math.random().toString(36).substr(2, 9)}`, 
          created_at: editingMaterial ? editingMaterial.created_at : new Date().toISOString() 
        };
        const updated = editingMaterial ? existing.map((m: any) => m.id === editingMaterial.id ? newItem : m) : [newItem, ...existing];
        sessionStorage.setItem('dev_materials', JSON.stringify(updated));
        setShowAddForm(false); resetForm(); loadMaterials(); return;
      }
      if (editingMaterial) {
        const { error } = await supabase.from('materials').update(materialData).eq('id', editingMaterial.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('materials').insert([materialData]);
        if (error) throw error;
      }
      setShowAddForm(false); resetForm(); loadMaterials();
    } catch (error) { alert('Failed to save material.'); }
  };

  const deleteMaterial = async (id: string) => {
    if (!confirm('Are you sure?')) return;
    if (organizationId === '00000000-0000-0000-0000-000000000000') {
      const existing = JSON.parse(sessionStorage.getItem('dev_materials') || '[]');
      sessionStorage.setItem('dev_materials', JSON.stringify(existing.filter((m: any) => m.id !== id)));
      loadMaterials(); return;
    }
    await supabase.from('materials').delete().eq('id', id); loadMaterials();
  };

  const subjects = Array.from(new Set(materials.map(m => m.subject).filter(Boolean))).sort() as string[];

  if (loading) return <div className="p-8 text-center font-bold text-slate-800">Loading resources...</div>;

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* HEADER WITH CORRECT CONTRAST */}
      <div className="bg-gradient-to-r from-purple-800 to-indigo-900 pb-32 pt-12 px-8">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div>
            <button onClick={() => router.push('/dashboard')} className="text-white/80 mb-2 block hover:text-white transition-colors text-sm font-bold">
              ← Back to Dashboard
            </button>
            <h1 className="text-4xl font-black text-white tracking-tight">Materials & Resources</h1>
            <p className="text-white/90 mt-2 font-semibold">Track your curriculum, logins, and supplies.</p>
          </div>
          <button onClick={openAddForm} className="bg-white text-indigo-900 px-8 py-3 rounded-xl font-black hover:bg-slate-100 transition-all shadow-xl active:scale-95">
            + Add Material
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-8 -mt-24">
        {/* STATS SUMMARY */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {(['textbook', 'subscription', 'physical', 'digital'] as const).map((type) => {
            const count = materials.filter(m => m.material_type === type).length;
            const icons = { textbook: '📚', subscription: '🔑', physical: '🧰', digital: '💻' };
            return (
              <div key={type} className="bg-white p-6 rounded-2xl shadow-md border border-slate-200 flex items-center gap-4">
                <div className="text-3xl">{icons[type]}</div>
                <div>
                  <div className="text-xs font-black text-slate-500 uppercase tracking-widest">{type}s</div>
                  <div className="text-3xl font-black text-slate-900">{count}</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* SEARCH & FILTERS - DARKER TEXT */}
        <div className="bg-white rounded-2xl shadow-md border border-slate-200 p-6 mb-8">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <span className="absolute left-4 top-3.5 text-slate-500">🔍</span>
              <input
                type="text"
                placeholder="Search resources..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-300 rounded-xl outline-none focus:ring-4 focus:ring-purple-500/10 focus:border-purple-600 transition-all text-slate-900 font-bold placeholder:text-slate-400"
              />
            </div>
            <select value={filterType} onChange={(e) => setFilterType(e.target.value as any)} className="px-4 py-3.5 bg-slate-50 border border-slate-300 rounded-xl outline-none text-slate-900 font-bold cursor-pointer">
              <option value="all">All Types</option>
              <option value="textbook">Textbooks</option>
              <option value="subscription">Subscriptions</option>
              <option value="physical">Physical</option>
              <option value="digital">Digital</option>
            </select>
          </div>
        </div>

        {/* RESOURCE LIST - HIGH CONTRAST */}
        <div className="space-y-8 pb-20">
          {(['textbook', 'subscription', 'physical', 'digital'] as MaterialType[]).map(type => {
            const typeMaterials = materials.filter(m => m.material_type === type);
            if (typeMaterials.length === 0) return null;
            const icons = { textbook: '📚', subscription: '🔑', physical: '🧰', digital: '💻' };
            return (
              <div key={type} className="bg-white rounded-2xl shadow-md border border-slate-200 overflow-hidden">
                <div className="bg-slate-100 px-8 py-4 border-b border-slate-200">
                  <h2 className="text-sm font-black text-slate-700 uppercase tracking-widest flex items-center gap-2">
                    {icons[type]} {type}s
                  </h2>
                </div>
                <div className="divide-y divide-slate-100">
                  {typeMaterials.map(m => (
                    <div key={m.id} className="p-8 flex flex-col md:flex-row justify-between items-start md:items-center hover:bg-slate-50 transition-colors group">
                      <div className="flex-1">
                        <h3 className="text-xl font-black text-slate-900">{m.name}</h3>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-sm font-bold text-slate-600">
                          <span>{m.subject || 'General'}</span>
                          <span className="text-slate-300">•</span>
                          <span>{m.grade_level || 'All Grades'}</span>
                          {m.url && (
                            <>
                              <span className="text-slate-300">•</span>
                              <a href={m.url} target="_blank" rel="noopener noreferrer" className="text-indigo-700 hover:text-indigo-900 flex items-center gap-1 bg-indigo-50 px-3 py-1 rounded-lg border border-indigo-100">
                                🔗 Open Resource
                              </a>
                            </>
                          )}
                        </div>
                        {m.login_info && (
                          <p className="text-sm text-slate-900 mt-4 font-mono bg-amber-100/50 inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-amber-200 shadow-sm">
                            <span className="text-lg">🗝️</span> 
                            <span className="font-black underline decoration-amber-500/30">{m.login_info}</span>
                          </p>
                        )}
                      </div>
                      <div className="flex gap-3 mt-4 md:mt-0">
                        <button onClick={() => openEditForm(m)} className="px-6 py-2 rounded-xl font-black text-indigo-700 bg-indigo-50 hover:bg-indigo-100 transition-colors border border-indigo-100">Edit</button>
                        <button onClick={() => deleteMaterial(m.id)} className="px-6 py-2 rounded-xl font-black text-red-700 hover:bg-red-50 transition-colors border border-transparent hover:border-red-100">Delete</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* FORM MODAL - HIGH CONTRAST INPUTS */}
      {showAddForm && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-10 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200">
            <h2 className="text-3xl font-black text-slate-900 mb-8">{editingMaterial ? 'Edit' : 'Add New'} Material</h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-sm font-black text-slate-900 mb-2 uppercase tracking-wide">Resource Name *</label>
                  <input type="text" value={formName} onChange={e => setFormName(e.target.value)} className="w-full p-4 bg-slate-50 border-2 border-slate-200 rounded-xl outline-none focus:border-purple-600 text-slate-900 font-bold" placeholder="e.g. Saxon Math 5/4" required />
                </div>
                <div>
                  <label className="block text-sm font-black text-slate-900 mb-2 uppercase tracking-wide">Subject</label>
                  <input type="text" value={formSubject} onChange={e => setFormSubject(e.target.value)} className="w-full p-4 bg-slate-50 border-2 border-slate-200 rounded-xl text-slate-900 font-bold" />
                </div>
                <div>
                  <label className="block text-sm font-black text-slate-900 mb-2 uppercase tracking-wide">Type</label>
                  <select value={formType} onChange={e => setFormType(e.target.value as any)} className="w-full p-4 bg-slate-50 border-2 border-slate-200 rounded-xl text-slate-900 font-bold">
                    <option value="textbook">Textbook</option>
                    <option value="subscription">Subscription</option>
                    <option value="physical">Physical Material</option>
                    <option value="digital">Digital Resource</option>
                  </select>
                </div>
              </div>

              {(formType === 'digital' || formType === 'subscription') && (
                <div className="bg-purple-50 p-6 rounded-2xl border-2 border-purple-200 space-y-4 shadow-inner">
                  <div>
                    <label className="block text-sm font-black text-purple-900 mb-2 uppercase tracking-wide">Resource URL</label>
                    <input type="url" value={formUrl} onChange={e => setFormUrl(e.target.value)} className="w-full p-4 bg-white border-2 border-purple-300 rounded-xl outline-none focus:border-purple-600 text-slate-900 font-bold" placeholder="https://..." />
                  </div>
                  {formType === 'subscription' && (
                    <div>
                      <label className="block text-sm font-black text-purple-900 mb-2 uppercase tracking-wide">Access Credentials (Visible in List)</label>
                      <input type="text" value={formLoginInfo} onChange={e => setFormLoginInfo(e.target.value)} className="w-full p-4 bg-white border-2 border-purple-300 rounded-xl outline-none focus:border-purple-600 text-slate-900 font-bold" placeholder="Username / Password notes" />
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-4 pt-6">
                <button type="submit" className="flex-1 bg-indigo-700 text-white font-black py-5 rounded-2xl hover:bg-indigo-800 transition-all shadow-xl shadow-indigo-200">
                  {editingMaterial ? 'Update' : 'Save'} Resource
                </button>
                <button type="button" onClick={() => setShowAddForm(false)} className="flex-1 bg-slate-100 text-slate-900 font-black py-5 rounded-2xl hover:bg-slate-200 transition-all">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
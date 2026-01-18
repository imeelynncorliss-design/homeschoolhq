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
  }, [organizationId, filterType, filterSubject]);

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      const { data: settings } = await supabase
        .from('school_year_settings')
        .select('organization_id')
        .eq('user_id', user.id)
        .maybeSingle();

      const orgId = settings?.organization_id || user.id;
      setOrganizationId(orgId);
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const loadMaterials = async () => {
    if (!organizationId) return;

    setLoading(true);
    try {
      let query = supabase
        .from('materials')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });

      if (filterType !== 'all') {
        query = query.eq('material_type', filterType);
      }

      if (filterSubject !== 'all') {
        query = query.eq('subject', filterSubject);
      }

      const { data, error } = await query;

      if (error) throw error;
      setMaterials(data || []);
    } catch (error) {
      console.error('Error loading materials:', error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormType('textbook');
    setFormName('');
    setFormSubject('');
    setFormGrade('');
    setFormPublisher('');
    setFormQuantity(1);
    setFormCondition('');
    setFormUrl('');
    setFormLoginInfo('');
    setFormLicenseExpires('');
    setFormNotes('');
    setEditingMaterial(null);
  };

  const openAddForm = () => {
    resetForm();
    setShowAddForm(true);
  };

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
      if (editingMaterial) {
        const { error } = await supabase
          .from('materials')
          .update(materialData)
          .eq('id', editingMaterial.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('materials')
          .insert([materialData]);

        if (error) throw error;
      }

      setShowAddForm(false);
      resetForm();
      loadMaterials();
    } catch (error) {
      console.error('Error saving material:', error);
      alert('Failed to save material. Please try again.');
    }
  };

  const deleteMaterial = async (id: string) => {
    if (!confirm('Are you sure you want to delete this material?')) return;

    try {
      const { error } = await supabase
        .from('materials')
        .delete()
        .eq('id', id);

      if (error) throw error;
      loadMaterials();
    } catch (error) {
      console.error('Error deleting material:', error);
      alert('Failed to delete material. Please try again.');
    }
  };

  const getMaterialIcon = (type: MaterialType) => {
    const icons = {
      textbook: '📚',
      subscription: '🔑',
      physical: '🧰',
      digital: '💻'
    };
    return icons[type];
  };

  const getMaterialTypeLabel = (type: MaterialType) => {
    const labels = {
      textbook: 'Textbook',
      subscription: 'Subscription',
      physical: 'Physical Material',
      digital: 'Digital Resource'
    };
    return labels[type];
  };

  // Get unique subjects for filter
  const subjects = Array.from(new Set(materials.map(m => m.subject).filter(Boolean))).sort();

  // Group materials by type


  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading materials...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.push('/dashboard')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors mb-4"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Dashboard
          </button>
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Materials & Resources</h1>
              <p className="text-gray-600 mt-2">
                Track your curriculum, subscriptions, and teaching materials
              </p>
            </div>
            <button
              onClick={openAddForm}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-semibold"
            >
              + Add Material
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-3">
              <span className="text-3xl">📚</span>
              <div>
                <div className="text-2xl font-bold text-gray-900">
                  {materials.filter(m => m.material_type === 'textbook').length}
                </div>
                <div className="text-sm text-gray-600">Textbooks</div>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-3">
              <span className="text-3xl">🔑</span>
              <div>
                <div className="text-2xl font-bold text-gray-900">
                  {materials.filter(m => m.material_type === 'subscription').length}
                </div>
                <div className="text-sm text-gray-600">Subscriptions</div>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-3">
              <span className="text-3xl">🧰</span>
              <div>
                <div className="text-2xl font-bold text-gray-900">
                  {materials.filter(m => m.material_type === 'physical').length}
                </div>
                <div className="text-sm text-gray-600">Physical Items</div>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-3">
              <span className="text-3xl">💻</span>
              <div>
                <div className="text-2xl font-bold text-gray-900">
                  {materials.filter(m => m.material_type === 'digital').length}
                </div>
                <div className="text-sm text-gray-600">Digital Resources</div>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h3 className="font-semibold text-gray-900 mb-4">Filter Materials</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Material Type</label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as MaterialType | 'all')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
              >
                <option value="all">All Types</option>
                <option value="textbook">📚 Textbooks</option>
                <option value="subscription">🔑 Subscriptions</option>
                <option value="physical">🧰 Physical Materials</option>
                <option value="digital">💻 Digital Resources</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Subject</label>
              <select
                value={filterSubject}
                onChange={(e) => setFilterSubject(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
              >
                <option value="all">All Subjects</option>
                {subjects.map(subject => (
                  <option key={subject} value={subject}>{subject}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

       {/* Materials List */}
       {materials.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <div className="text-6xl mb-4">📦</div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">No Materials Yet</h3>
            <p className="text-gray-600 mb-6">
              Start by adding your curriculum, subscriptions, and teaching materials.
            </p>
            <button
              onClick={openAddForm}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-semibold"
            >
              Add Your First Material
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Show materials grouped by type */}
            {(['textbook', 'subscription', 'physical', 'digital'] as MaterialType[]).map(type => {
              const typeMaterials = materials.filter(m => m.material_type === type);
              if (typeMaterials.length === 0) return null;

              return (
                <div key={type} className="bg-white rounded-lg shadow overflow-hidden">
                  <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                      <span>{getMaterialIcon(type)}</span>
                      {getMaterialTypeLabel(type)}
                      <span className="text-sm opacity-90 ml-2">({typeMaterials.length})</span>
                    </h2>
                  </div>
                  
                  <div className="divide-y divide-gray-200">
                    {typeMaterials.map(material => (
                      <div key={material.id} className="p-6 hover:bg-gray-50 transition-colors">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">
                              {material.name}
                            </h3>
                            
                            <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                              {material.subject && (
                                <div>
                                  <span className="text-gray-600">Subject:</span>
                                  <span className="ml-2 font-medium text-gray-900">{material.subject}</span>
                                </div>
                              )}
                              {material.grade_level && (
                                <div>
                                  <span className="text-gray-600">Grade:</span>
                                  <span className="ml-2 font-medium text-gray-900">{material.grade_level}</span>
                                </div>
                              )}
                              {material.publisher && (
                                <div>
                                  <span className="text-gray-600">Publisher:</span>
                                  <span className="ml-2 font-medium text-gray-900">{material.publisher}</span>
                                </div>
                              )}
                              {material.quantity && material.quantity > 1 && (
                                <div>
                                  <span className="text-gray-600">Quantity:</span>
                                  <span className="ml-2 font-medium text-gray-900">{material.quantity}</span>
                                </div>
                              )}
                              {material.condition && (
                                <div>
                                  <span className="text-gray-600">Condition:</span>
                                  <span className="ml-2 font-medium text-gray-900">{material.condition}</span>
                                </div>
                              )}
                              {material.license_expires && (
                                <div>
                                  <span className="text-gray-600">Expires:</span>
                                  <span className="ml-2 font-medium text-gray-900">
                                    {new Date(material.license_expires).toLocaleDateString()}
                                  </span>
                                </div>
                              )}
                            </div>

                            {material.url && (
                              <a
                                href={material.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-700 text-sm mb-2 inline-block"
                              >
                                🔗 Open Resource →
                              </a>
                            )}

                            {material.login_info && (
                              <div className="bg-blue-50 border border-blue-200 rounded p-3 text-sm mb-2">
                                <span className="font-medium text-blue-900">Login Info:</span>
                                <span className="ml-2 text-blue-700">{material.login_info}</span>
                              </div>
                            )}

                            {material.notes && (
                              <p className="text-sm text-gray-600 italic mt-2">{material.notes}</p>
                            )}
                          </div>

                          <div className="flex gap-2 ml-4">
                            <button
                              onClick={() => openEditForm(material)}
                              className="px-3 py-2 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 text-sm"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => deleteMaterial(material.id)}
                              className="px-3 py-2 bg-red-100 text-red-700 rounded hover:bg-red-200 text-sm"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
     </div>

      {/* Add/Edit Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">
                {editingMaterial ? 'Edit Material' : 'Add New Material'}
              </h2>
              <button
                onClick={() => { setShowAddForm(false); resetForm(); }}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Material Type *
                </label>
                <select
                  value={formType}
                  onChange={(e) => setFormType(e.target.value as MaterialType)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
                  required
                >
                  <option value="textbook">📚 Textbook / Workbook</option>
                  <option value="subscription">🔑 Subscription / Online Service</option>
                  <option value="physical">🧰 Physical Material / Manipulative</option>
                  <option value="digital">💻 Digital Resource</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Name *
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
                  placeholder="e.g., Saxon Math 5/4, Khan Academy, Cuisenaire Rods"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Subject</label>
                  <input
                    type="text"
                    value={formSubject}
                    onChange={(e) => setFormSubject(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
                    placeholder="e.g., Math, Science"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Grade Level</label>
                  <input
                    type="text"
                    value={formGrade}
                    onChange={(e) => setFormGrade(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
                    placeholder="e.g., 5th Grade, K-3"
                  />
                </div>
              </div>

              {(formType === 'textbook' || formType === 'physical') && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Publisher</label>
                    <input
                      type="text"
                      value={formPublisher}
                      onChange={(e) => setFormPublisher(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
                      placeholder="e.g., Saxon Publishers"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Condition</label>
                    <select
                      value={formCondition}
                      onChange={(e) => setFormCondition(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
                    >
                      <option value="">Select condition...</option>
                      <option value="New">New</option>
                      <option value="Like New">Like New</option>
                      <option value="Good">Good</option>
                      <option value="Fair">Fair</option>
                      <option value="Poor">Poor</option>
                    </select>
                  </div>
                </div>
              )}

              {formType === 'physical' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Quantity</label>
                  <input
                    type="number"
                    min="1"
                    value={formQuantity}
                    onChange={(e) => setFormQuantity(parseInt(e.target.value) || 1)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
                  />
                </div>
              )}

              {(formType === 'subscription' || formType === 'digital') && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">URL / Website</label>
                    <input
                      type="url"
                      value={formUrl}
                      onChange={(e) => setFormUrl(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
                      placeholder="https://..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Login Info</label>
                    <input
                      type="text"
                      value={formLoginInfo}
                      onChange={(e) => setFormLoginInfo(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
                      placeholder="username@example.com / password"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">License Expires</label>
                    <input
                      type="date"
                      value={formLicenseExpires}
                      onChange={(e) => setFormLicenseExpires(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
                    />
                  </div>
                </>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                <textarea
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
                  rows={3}
                  placeholder="Any additional information..."
                />
              </div>

              <div className="flex gap-3 pt-4 border-t">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 font-semibold"
                >
                  {editingMaterial ? 'Update Material' : 'Add Material'}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowAddForm(false); resetForm(); }}
                  className="flex-1 border border-gray-300 py-3 rounded-lg hover:bg-gray-50 text-gray-900 font-semibold"
                >
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
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

type Child = {
  id: string;
  displayname: string;
  grade?: string;
  learning_style?: string;
};

type Material = {
  id: string;
  name: string;
  material_type: string; // Changed from 'type' to 'material_type'
  quantity?: number;
  notes?: string;
  url?: string;
};

type LessonVariation = {
  title: string;
  approach: string;
  description?: string;  
  materials: string[];
  activities: Array<{
    name: string;
    duration: string;
    description: string;
  }>;
  assessment: string;
  extensions: string[];
  learningObjectives?: string[];
};

type LessonGeneratorProps = {
  kids: Child[];
  userId: string; 
  onClose: () => void;
};

export default function LessonGenerator({ kids, userId, onClose }: LessonGeneratorProps) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [variations, setVariations] = useState<LessonVariation[]>([]);
  const [selectedVariation, setSelectedVariation] = useState<LessonVariation | null>(null);
  
  // Materials state
  const [availableMaterials, setAvailableMaterials] = useState<Material[]>([]);
  const [selectedMaterialIds, setSelectedMaterialIds] = useState<Set<string>>(new Set());
  const [loadingMaterials, setLoadingMaterials] = useState(false);
  const [showAddMaterialModal, setShowAddMaterialModal] = useState(false);
  const [materialSearchQuery, setMaterialSearchQuery] = useState('');
  const [expandedTypes, setExpandedTypes] = useState<Set<string>>(new Set(['textbook', 'subscription', 'physical', 'digital']));
  const [editingLearningStyle, setEditingLearningStyle] = useState(false);
  
  // Quick add material form
  const [newMaterialName, setNewMaterialName] = useState('');
  const [newMaterialType, setNewMaterialType] = useState('physical'); // Default to physical for lesson generation
  const [newMaterialQuantity, setNewMaterialQuantity] = useState(1);
  const [newMaterialNotes, setNewMaterialNotes] = useState('');
  const [newMaterialUrl, setNewMaterialUrl] = useState('');
  const [addingMaterial, setAddingMaterial] = useState(false);
  
  // Form data
  const [formData, setFormData] = useState({
    childId: '',
    childName: '',
    gradeLevel: '',
    subject: '',
    duration: 30,
    startDate: new Date().toISOString().split('T')[0],
    learningObjectives: '',
    materials: '',
    learningStyle: '',
    surpriseMe: false
  });

  // Fetch materials when component mounts
  useEffect(() => {
    fetchMaterials();
  }, [userId]);

  const fetchMaterials = async () => {
    setLoadingMaterials(true);
    try {
      const { data, error } = await supabase
        .from('materials')
        .select('*')
        .eq('organization_id', userId)
        .order('name');

      if (error) {
        console.error('Error fetching materials:', error);
      } else if (data) {
        setAvailableMaterials(data);
        // Auto-select all materials by default
        setSelectedMaterialIds(new Set(data.map(m => m.id)));
        // Pre-populate the materials field
        const materialsList = data.map(m => m.name).join(', ');
        setFormData(prev => ({ ...prev, materials: materialsList }));
      }
    } catch (err) {
      console.error('Unexpected error fetching materials:', err);
    } finally {
      setLoadingMaterials(false);
    }
  };

  const handleChildSelect = (childId: string) => {
    const child = kids.find(c => c.id === childId);
    if (child) {
      setFormData({
        ...formData,
        childId,
        childName: child.displayname,
        gradeLevel: child.grade || '',
        learningStyle: child.learning_style || '' // Pull from profile
      });
      setEditingLearningStyle(false); // Reset editing state when child changes
    }
  };

  const toggleMaterialSelection = (materialId: string) => {
    const newSelection = new Set(selectedMaterialIds);
    if (newSelection.has(materialId)) {
      newSelection.delete(materialId);
    } else {
      newSelection.add(materialId);
    }
    setSelectedMaterialIds(newSelection);
    
    // Update the materials string for API
    const selectedMaterials = availableMaterials
      .filter(m => newSelection.has(m.id))
      .map(m => m.name);
    setFormData(prev => ({ ...prev, materials: selectedMaterials.join(', ') }));
  };

  const selectAllMaterials = () => {
    const allIds = new Set(availableMaterials.map(m => m.id));
    setSelectedMaterialIds(allIds);
    setFormData(prev => ({ 
      ...prev, 
      materials: availableMaterials.map(m => m.name).join(', ') 
    }));
  };

  const clearAllMaterials = () => {
    setSelectedMaterialIds(new Set());
    setFormData(prev => ({ ...prev, materials: '' }));
  };

  const toggleTypeExpansion = (type: string) => {
    const newExpanded = new Set(expandedTypes);
    if (newExpanded.has(type)) {
      newExpanded.delete(type);
    } else {
      newExpanded.add(type);
    }
    setExpandedTypes(newExpanded);
  };

  const getGroupedMaterials = () => {
    // Filter to only physical materials for lesson generation
    const physicalOnly = availableMaterials.filter(m => m.material_type === 'physical');
    
    const filtered = physicalOnly.filter(m => 
      materialSearchQuery === '' || 
      m.name.toLowerCase().includes(materialSearchQuery.toLowerCase())
    );

    const groups: { [key: string]: Material[] } = {
      physical: []
    };

    filtered.forEach(material => {
      groups['physical'].push(material);
    });

    return groups;
  };

  const getTypeInfo = (type: string) => {
    const typeMap: { [key: string]: { label: string; icon: string; color: string } } = {
      textbook: { label: 'Textbooks', icon: '📚', color: 'bg-blue-50 border-blue-200' },
      subscription: { label: 'Subscriptions', icon: '🔐', color: 'bg-purple-50 border-purple-200' },
      physical: { label: 'Physical Materials', icon: '🧩', color: 'bg-green-50 border-green-200' },
      digital: { label: 'Digital Resources', icon: '💻', color: 'bg-orange-50 border-orange-200' }
    };
    return typeMap[type] || { label: type, icon: '📦', color: 'bg-gray-50 border-gray-200' };
  };

  const quickAddMaterial = async () => {
    if (!newMaterialName.trim()) {
      alert('Please enter a material name');
      return;
    }

    setAddingMaterial(true);
    try {
      const { data, error } = await supabase
        .from('materials')
        .insert([{
          organization_id: userId,
          name: newMaterialName.trim(),
          material_type: newMaterialType, // Changed from 'type' to 'material_type'
          quantity: newMaterialQuantity,
          notes: newMaterialNotes.trim() || null,
          url: newMaterialUrl.trim() || null
        }])
        .select()
        .single();

      if (error) {
        console.error('Error adding material:', error);
        alert('Failed to add material: ' + error.message);
      } else if (data) {
        // Add to local list
        setAvailableMaterials(prev => [...prev, data]);
        // Auto-select the new material
        setSelectedMaterialIds(prev => new Set([...prev, data.id]));
        // Update form data
        const updatedMaterials = [...availableMaterials, data]
          .filter(m => selectedMaterialIds.has(m.id) || m.id === data.id)
          .map(m => m.name)
          .join(', ');
        setFormData(prev => ({ ...prev, materials: updatedMaterials }));
        
        // Reset form
        setNewMaterialName('');
        setNewMaterialType('physical');
        setNewMaterialQuantity(1);
        setNewMaterialNotes('');
        setNewMaterialUrl('');
        setShowAddMaterialModal(false);
        
        alert('✅ Material added successfully!');
      }
    } catch (err) {
      console.error('Unexpected error:', err);
      alert('Failed to add material. Please try again.');
    } finally {
      setAddingMaterial(false);
    }
  };

  const generateLessons = async () => {
    setLoading(true);
    setStep(2);
    try {
      // Only use selected physical materials
      const selectedPhysicalMaterials = availableMaterials
        .filter(m => selectedMaterialIds.has(m.id) && m.material_type === 'physical')
        .map(m => m.name)
        .join(', ');

      const response = await fetch('/api/generate-lesson', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          materials: selectedPhysicalMaterials
        })
      });

      if (!response.ok) {
        throw new Error('Failed to generate lessons');
      }
      
      const data = await response.json();
      setVariations(data.variations || []);
      setStep(3);
    } catch (error: any) {
      console.error('Generation error:', error);
      alert(`Failed to generate lessons: ${error.message}`);
      setStep(1);
    } finally {
      setLoading(false);
    }
  };

  const saveLesson = async (variation: LessonVariation) => {
    if (!formData.childId) {
      alert('Please select a child first');
      return;
    }

    try {
      const { data: kid, error: kidError } = await supabase
        .from('kids')
        .select('organization_id, displayname')
        .eq('id', formData.childId)
        .single();

      if (kidError) {
        console.error('Error fetching kid:', kidError);
      }

      const organizationId = kid?.organization_id || 'd52497c0-42a9-49b7-ba3b-849bffa27fc4';

      const { data: savedLesson, error } = await supabase
        .from('lessons')
        .insert([{
          kid_id: formData.childId,
          subject: formData.subject,
          title: variation.title,
          description: JSON.stringify(variation),
          lesson_date: null,
          duration_minutes: Number(formData.duration) || 30,
          status: 'not_started',
          organization_id: organizationId 
        }]);

      if (error) {
        console.error('Save failed:', error);
        alert(`❌ Failed to save lesson: ${error.message}`);
      } else {
        const childName = kid?.displayname || 'your student';
        alert(`✅ Lesson saved successfully!\n\n"${variation.title}" has been added to ${childName}'s lessons.\n\nClick OK to return to your dashboard where you can view and schedule this lesson.`);
        onClose();
        setTimeout(() => {
          window.location.reload();
        }, 300);
      }
    } catch (error: any) {
      console.error('Unexpected error:', error);
      alert(`❌ Failed to save lesson: ${error.message}`);
    }
  };

  const [showAdaptModal, setShowAdaptModal] = useState(false);
  const [adaptTargetChildId, setAdaptTargetChildId] = useState('');

  const adaptForAnotherChild = () => {
    setShowAdaptModal(true);
  };

  const saveAdaptedLesson = async () => {
    if (!adaptTargetChildId || !selectedVariation) return;

    try {
      const targetChild = kids.find(c => c.id === adaptTargetChildId);
      if (!targetChild) return;

      const { data } = await supabase.auth.getUser()
      const currentUser = data.user
      
      if (!currentUser) {
        alert('You must be logged in to save lessons')
        return
      }

      const { data: insertData, error } = await supabase
        .from('lessons')
        .insert([{
          kid_id: adaptTargetChildId,
          user_id: currentUser.id,
          subject: formData.subject,
          title: selectedVariation.title,
          description: JSON.stringify(selectedVariation),
          lesson_date: formData.startDate,
          duration_minutes: formData.duration,
          status: 'not_started'
        }])
        .select()

      if (error) {
        console.error('Adapt failed:', error);
        alert(`Failed to adapt lesson: ${error.message}`);
      } else {
        alert(`Lesson adapted for ${targetChild.displayname}!`);
        setShowAdaptModal(false);
        setAdaptTargetChildId('');
        router.refresh();
      }
    } catch (error) {
      console.error('Adapt failed:', error);
      alert('Failed to adapt lesson. Please try again.');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">📚 Lesson Generator</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-2xl leading-none">
            ✕
          </button>
        </div>

        {/* Step 1: Who & What */}
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">Select Child</label>
              <select
                value={formData.childId}
                onChange={(e) => handleChildSelect(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-gray-900"
              >
                <option value="">Choose a child...</option>
                {kids.map(child => (
                  <option key={child.id} value={child.id}>
                    {child.displayname}{child.grade ? ` (${child.grade})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">Subject</label>
              <input
                type="text"
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                placeholder="e.g., Math, Science, History..."
                className="w-full border rounded-lg px-3 py-2 text-gray-900"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">Duration</label>
              <div className="flex gap-2">
                {[15, 30, 45, 60].map(min => (
                  <button
                    key={min}
                    onClick={() => setFormData({ ...formData, duration: min })}
                    className={`px-4 py-2 rounded-lg ${
                      formData.duration === min
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 hover:bg-gray-300 text-gray-900'
                    }`}
                  >
                    {min} min
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">Start Date</label>
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 text-gray-900"
              />
            </div>

            <button
              onClick={() => setStep(2)}
              disabled={!formData.childId || !formData.subject}
              className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed"
            >
              Continue
            </button>
          </div>
        )}

        {/* Step 2: Details (Optional) */}
        {step === 2 && !loading && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <input
                type="checkbox"
                id="surpriseMe"
                checked={formData.surpriseMe}
                onChange={(e) => setFormData({ ...formData, surpriseMe: e.target.checked })}
                className="w-4 h-4"
              />
              <label htmlFor="surpriseMe" className="text-sm font-medium text-gray-900">
                Just surprise me! (Skip details)
              </label>
            </div>

            {!formData.surpriseMe && (
              <details open className="border rounded-lg p-4">
                <summary className="font-medium cursor-pointer mb-4 text-gray-900">
                  Advanced Options (Optional)
                </summary>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">Learning Objectives</label>
                    <textarea
                      value={formData.learningObjectives}
                      onChange={(e) => setFormData({ ...formData, learningObjectives: e.target.value })}
                      placeholder="What should they learn from this lesson?"
                      className="w-full border rounded-lg px-3 py-2 text-gray-900"
                      rows={3}
                    />
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="block text-sm font-medium text-gray-900">
                        Physical Materials ({availableMaterials.filter(m => m.material_type === 'physical').length} available)
                      </label>
                      {availableMaterials.filter(m => m.material_type === 'physical').length > 0 && (
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              const physicalIds = availableMaterials
                                .filter(m => m.material_type === 'physical')
                                .map(m => m.id);
                              setSelectedMaterialIds(new Set(physicalIds));
                              const materials = availableMaterials
                                .filter(m => m.material_type === 'physical')
                                .map(m => m.name)
                                .join(', ');
                              setFormData(prev => ({ ...prev, materials }));
                            }}
                            className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                          >
                            Select All
                          </button>
                          <button
                            type="button"
                            onClick={clearAllMaterials}
                            className="text-xs text-gray-600 hover:text-gray-800 font-medium"
                          >
                            Clear All
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Info box explaining material purpose */}
                    <div className="mb-3 bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <p className="text-xs text-blue-900">
                        <strong>🧩 Select physical materials</strong> you have on hand. AI will create hands-on lessons using these specific items.
                      </p>
                    </div>

                    {/* Materials Display - Physical Only */}
                    {loadingMaterials ? (
                      <div className="border border-gray-200 rounded-lg p-4 text-center">
                        <p className="text-sm text-gray-600">Loading your materials...</p>
                      </div>
                    ) : availableMaterials.filter(m => m.material_type === 'physical').length === 0 ? (
                      <div className="border border-gray-200 rounded-lg p-6 text-center">
                        <p className="text-sm text-gray-600 mb-3">No physical materials in your list yet.</p>
                        <button
                          type="button"
                          onClick={() => setShowAddMaterialModal(true)}
                          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium"
                        >
                          + Add Your First Material
                        </button>
                      </div>
                    ) : (
                      <div className="border border-gray-200 rounded-lg bg-gray-50">
                        {/* Search Bar */}
                        {availableMaterials.filter(m => m.material_type === 'physical').length > 5 && (
                          <div className="p-3 border-b border-gray-200 bg-white">
                            <input
                              type="text"
                              value={materialSearchQuery}
                              onChange={(e) => setMaterialSearchQuery(e.target.value)}
                              placeholder="🔍 Search materials..."
                              className="w-full px-3 py-2 border border-gray-300 rounded text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                          </div>
                        )}

                        {/* Physical Materials Grid */}
                        <div className="p-3 grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
                          {availableMaterials
                            .filter(m => m.material_type === 'physical')
                            .filter(m => 
                              materialSearchQuery === '' || 
                              m.name.toLowerCase().includes(materialSearchQuery.toLowerCase())
                            )
                            .map(material => (
                              <label
                                key={material.id}
                                className={`flex items-start gap-2 p-3 rounded-lg cursor-pointer transition-colors ${
                                  selectedMaterialIds.has(material.id)
                                    ? 'bg-green-100 border-2 border-green-400 shadow-sm'
                                    : 'bg-white border-2 border-transparent hover:border-gray-300'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={selectedMaterialIds.has(material.id)}
                                  onChange={() => toggleMaterialSelection(material.id)}
                                  className="mt-0.5"
                                />
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-gray-900 truncate">
                                    {material.name}
                                  </p>
                                  {material.quantity && (
                                    <p className="text-xs text-gray-500">Qty: {material.quantity}</p>
                                  )}
                                </div>
                              </label>
                            ))}
                        </div>
                        
                        {/* Add Material Button */}
                        <div className="p-3 border-t border-gray-200 bg-white text-center">
                          <button
                            type="button"
                            onClick={() => setShowAddMaterialModal(true)}
                            className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
                          >
                            + Need to add a material?
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Count selected physical materials only */}
                    {(() => {
                      const selectedPhysicalCount = availableMaterials
                        .filter(m => m.material_type === 'physical' && selectedMaterialIds.has(m.id))
                        .length;
                      
                      return (
                        <p className="text-xs text-gray-500 mt-3">
                          ✨ AI will generate lessons using your physical materials ({selectedPhysicalCount} selected) and {formData.childName || 'your student'}'s learning style
                          {formData.learningStyle && ` (${formData.learningStyle})`}.
                        </p>
                      );
                    })()}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">
                      {formData.childName}'s Learning Style
                    </label>
                    {formData.learningStyle && !editingLearningStyle ? (
                      <div className="border border-green-200 bg-green-50 rounded-lg p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-green-600 text-lg">✓</span>
                            <div>
                              <p className="text-sm font-semibold text-gray-900 capitalize">
                                {formData.learningStyle.replace('-', ' / ')}
                              </p>
                              <p className="text-xs text-gray-600">From student profile</p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setEditingLearningStyle(true)}
                            className="text-xs px-3 py-1 bg-white border border-gray-300 rounded hover:bg-gray-50 text-gray-700"
                          >
                            Edit
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <select
                          value={formData.learningStyle}
                          onChange={(e) => setFormData({ ...formData, learningStyle: e.target.value })}
                          className="w-full border rounded-lg px-3 py-2 text-gray-900"
                        >
                          <option value="">Any approach...</option>
                          <option value="hands-on">Hands-on / Kinesthetic</option>
                          <option value="visual">Visual / Creative</option>
                          <option value="discussion">Discussion-based</option>
                          <option value="independent">Independent / Self-paced</option>
                        </select>
                        {editingLearningStyle && (
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => setEditingLearningStyle(false)}
                              className="flex-1 text-xs px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700"
                            >
                              ✓ Save
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingLearningStyle(false);
                                // Reset to original from child profile if available
                                const child = kids.find(k => k.id === formData.childId);
                                if (child?.learning_style) {
                                  setFormData(prev => ({ ...prev, learningStyle: child.learning_style || '' }));
                                }
                              }}
                              className="flex-1 text-xs px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 text-gray-700"
                            >
                              Cancel
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </details>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => setStep(1)}
                className="flex-1 border border-gray-300 py-3 rounded-lg hover:bg-gray-50 text-gray-900"
              >
                Back
              </button>
              <button
                onClick={generateLessons}
                disabled={loading}
                className="flex-1 bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 disabled:bg-blue-400"
              >
                {loading ? 'Generating...' : 'Generate Lessons'}
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Loading State */}
        {step === 2 && loading && (
          <div className="flex flex-col items-center justify-center py-16 px-8">
            <div className="relative">
              <div className="w-20 h-20 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-12 h-12 bg-blue-100 rounded-full animate-pulse"></div>
              </div>
            </div>
            
            <div className="mt-8 text-center space-y-3">
              <h3 className="text-2xl font-bold text-gray-900">
                ✨ Creating Personalized Lessons
              </h3>
              <p className="text-gray-600 max-w-md">
                HomeschoolHQ Assistant is generating 3 unique lesson variations tailored to{' '}
                <span className="font-semibold text-blue-600">
                  {formData.childName || 'your student'}
                </span>
                's learning style...
              </p>
              
              <div className="mt-6 space-y-2 text-sm text-gray-500">
                <div className="flex items-center justify-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span>Analyzing student profile</span>
                </div>
                <div className="flex items-center justify-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span>Designing activities and materials</span>
                </div>
                <div className="flex items-center justify-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span>Creating learning objectives</span>
                </div>
              </div>
              
              <p className="text-xs text-gray-400 mt-6 italic">
                This usually takes 15-20 seconds...
              </p>
            </div>
          </div>
        )}

        {/* Step 3: Preview & Choose */}
        {step === 3 && variations && variations.length > 0 && (
          <div className="space-y-4">
            <p className="text-gray-600 mb-4">
              Choose the lesson that works best for {formData.childName}:
            </p>

            <div className="grid md:grid-cols-3 gap-4">
              {variations.map((variation, index) => (
                <div key={index} className="border-2 rounded-lg overflow-hidden hover:border-blue-500 transition-colors bg-white shadow-sm">
                  {/* Header */}
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 border-b">
                    <h3 className="font-bold text-lg text-gray-900 mb-1">{variation.title}</h3>
                    <p className="text-sm text-gray-600">{variation.description || variation.approach}</p>
                  </div>

                  {/* Content */}
                  <div className="p-4 space-y-4 max-h-96 overflow-y-auto">
                    {/* Materials */}
                    <div>
                      <h4 className="font-semibold text-sm text-gray-900 mb-2">📦 Materials:</h4>
                      <ul className="text-sm text-gray-600 space-y-1">
                        {variation.materials.map((m, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="text-green-600 mt-0.5">✓</span>
                            <span>{m}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Activities */}
                    <div>
                      <h4 className="font-semibold text-sm text-gray-900 mb-2">🎯 Activities ({variation.activities.length}):</h4>
                      <div className="space-y-2">
                        {variation.activities.map((activity, i) => (
                          <div key={i} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                            <div className="flex items-start justify-between gap-2 mb-1">
                              <p className="font-medium text-sm text-gray-900">{activity.name}</p>
                              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full whitespace-nowrap">
                                {activity.duration}
                              </span>
                            </div>
                            <p className="text-xs text-gray-600">{activity.description}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Learning Objectives */}
                    {variation.learningObjectives && variation.learningObjectives.length > 0 && (
                      <div>
                        <h4 className="font-semibold text-sm text-gray-900 mb-2">🎓 Learning Objectives:</h4>
                        <ul className="text-sm text-gray-600 space-y-1">
                          {variation.learningObjectives.map((obj, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <span className="text-blue-600 mt-0.5">•</span>
                              <span>{obj}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  {/* Footer - Choose Button */}
                  <div className="p-4 bg-gray-50 border-t">
                    <button
                      onClick={() => saveLesson(variation)}
                      disabled={loading}
                      className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 disabled:bg-blue-400 font-semibold transition-colors"
                    >
                      {loading ? 'Saving...' : 'Choose This Lesson'}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
              <p className="text-sm text-gray-600 mb-3">Don't like these options?</p>
              <div className="flex gap-3">
                <button
                  onClick={generateLessons}
                  disabled={loading}
                  className="flex-1 bg-purple-600 text-white py-3 rounded-lg hover:bg-purple-700 disabled:bg-purple-400 font-medium transition-colors"
                >
                  {loading ? '🔄 Regenerating...' : '🔄 Try Different Options'}
                </button>
                <button
                  onClick={() => setStep(2)}
                  className="flex-1 border border-gray-300 py-3 rounded-lg hover:bg-gray-50 text-gray-900"
                >
                  ← Change Settings
                </button>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-full border-2 border-gray-300 py-3 rounded-lg hover:bg-gray-50 text-gray-700 font-medium"
            >
              Cancel & Close
            </button>
          </div>
        )}

        {/* Success State */}
        {selectedVariation && !showAdaptModal && (
          <div className="text-center space-y-4">
            <div className="text-green-600 text-5xl">✓</div>
            <h3 className="text-xl font-bold text-gray-900">Lesson Saved!</h3>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-left">
              <p className="text-sm text-gray-600 mb-1">Added to {formData.childName}'s schedule:</p>
              <p className="font-semibold text-gray-900">{selectedVariation.title}</p>
              <p className="text-sm text-gray-600 mt-1">📅 {new Date(formData.startDate).toLocaleDateString()}</p>
            </div>
            <div className="space-y-2">
              <button
                onClick={adaptForAnotherChild}
                className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700"
              >
                📚 Use this lesson for another child
              </button>
              <button
                onClick={onClose}
                className="w-full border border-gray-300 py-3 rounded-lg hover:bg-gray-50 text-gray-900"
              >
                Done
              </button>
            </div>
          </div>
        )}

        {/* Adapt Modal */}
        {showAdaptModal && selectedVariation && (
          <div className="space-y-4">
            <div className="text-center mb-4">
              <div className="text-4xl mb-2">📚</div>
              <h3 className="text-xl font-bold text-gray-900">Adapt Lesson for Another Child</h3>
              <p className="text-sm text-gray-600 mt-2">
                "{selectedVariation.title}" will be copied to the selected child
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Select Child
              </label>
              <select
                value={adaptTargetChildId}
                onChange={(e) => setAdaptTargetChildId(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-gray-900"
              >
                <option value="">Choose a child...</option>
                {kids
                  .filter(child => child.id !== formData.childId)
                  .map(child => (
                    <option key={child.id} value={child.id}>
                      {child.displayname}{child.grade ? ` (${child.grade})` : ''}
                    </option>
                  ))}
              </select>
            </div>

            <div className="flex gap-2">
              <button
                onClick={saveAdaptedLesson}
                disabled={!adaptTargetChildId}
                className="flex-1 bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                Save for {adaptTargetChildId ? kids.find(c => c.id === adaptTargetChildId)?.displayname : 'Child'}
              </button>
              <button
                onClick={() => {
                  setShowAdaptModal(false)
                  setAdaptTargetChildId('')
                }}
                className="flex-1 border border-gray-300 py-3 rounded-lg hover:bg-gray-50 text-gray-900"
              >
                Cancel
              </button>
            </div>

            <button
              onClick={onClose}
              className="w-full text-sm text-gray-600 hover:text-gray-900"
            >
              Close Generator
            </button>
          </div>
        )}
      </div>

      {/* Inline Add Material Modal - Physical Only */}
      {showAddMaterialModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-lg max-w-md w-full shadow-2xl">
            <div className="bg-gradient-to-r from-indigo-500 to-purple-600 px-6 py-4 rounded-t-lg">
              <h3 className="text-xl font-bold text-white">🧩 Add Physical Material</h3>
              <p className="text-white/90 text-sm mt-1">For use in AI-generated lessons</p>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Material Name *
                </label>
                <input
                  type="text"
                  value={newMaterialName}
                  onChange={(e) => setNewMaterialName(e.target.value)}
                  placeholder="e.g., Construction Paper, Play Dough, Math Manipulatives"
                  className="w-full border rounded-lg px-3 py-2 text-gray-900"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Quantity (Optional)
                </label>
                <input
                  type="number"
                  min="1"
                  value={newMaterialQuantity}
                  onChange={(e) => setNewMaterialQuantity(parseInt(e.target.value) || 1)}
                  className="w-full border rounded-lg px-3 py-2 text-gray-900"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Notes (Optional)
                </label>
                <textarea
                  value={newMaterialNotes}
                  onChange={(e) => setNewMaterialNotes(e.target.value)}
                  placeholder="Any additional details..."
                  rows={2}
                  className="w-full border rounded-lg px-3 py-2 text-gray-900"
                />
              </div>

              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <p className="text-xs text-green-900 font-semibold">
                  💡 This material will be saved to your Materials list and immediately available for lesson generation.
                </p>
              </div>
            </div>

            <div className="bg-gray-50 border-t border-gray-200 px-6 py-4 flex gap-3 rounded-b-lg">
              <button
                onClick={() => {
                  setShowAddMaterialModal(false);
                  setNewMaterialName('');
                  setNewMaterialType('physical');
                  setNewMaterialQuantity(1);
                  setNewMaterialNotes('');
                  setNewMaterialUrl('');
                }}
                disabled={addingMaterial}
                className="flex-1 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 font-medium py-2 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={quickAddMaterial}
                disabled={addingMaterial || !newMaterialName.trim()}
                className="flex-1 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium py-2 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                {addingMaterial ? 'Adding...' : 'Add Material'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
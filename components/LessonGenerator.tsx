'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

type Child = {
  id: string;
  displayname: string;
  grade?: string;
};

type LessonVariation = {
  title: string;
  approach: string;
  materials: string[];
  activities: Array<{
    name: string;
    duration: string;
    description: string;
  }>;
  assessment: string;
  extensions: string[];
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
  
  // Form data
  const [formData, setFormData] = useState({
    childId: '',
    childName: '',
    gradeLevel: '',
    subject: '',
    duration: 30,
    startDate: new Date().toISOString().split('T')[0], // Default to today
    learningObjectives: '',
    materials: '',
    learningStyle: '',
    surpriseMe: false
  });

  const handleChildSelect = (childId: string) => {
    const child = kids.find(c => c.id === childId);
    if (child) {
      setFormData({
        ...formData,
        childId,
        childName: child.displayname,
        gradeLevel: child.grade || ''
      });
    }
  };

  const generateLessons = async () => {
    setLoading(true);
    setStep(2);
    try {
      const response = await fetch('/api/generate-lesson', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        throw new Error('Failed to generate lessons');
      }
      
      const data = await response.json();
      setVariations(data.variations || []);
      setStep(3); // Show results
    } catch (error: any) {
      console.error('Generation error:', error);
      alert(`Failed to generate lessons: ${error.message}`);
      setStep(1); // Go back to form
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
      // Fetch the kid's organization_id
      const { data: kid, error: kidError } = await supabase
        .from('kids')
        .select('organization_id, displayname')
        .eq('id', formData.childId)
        .single();

      if (kidError) {
        console.error('Error fetching kid:', kidError);
      }

      // Use kid's organization_id, or fall back to your default org ID
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
        // Small delay before reload so user sees the success message
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

      // Get current user
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
                    <label className="block text-sm font-medium text-gray-900 mb-2">Materials You Have</label>
                    <input
                      type="text"
                      value={formData.materials}
                      onChange={(e) => setFormData({ ...formData, materials: e.target.value })}
                      placeholder="e.g., Building blocks, art supplies, computer..."
                      className="w-full border rounded-lg px-3 py-2 text-gray-900"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">Learning Style</label>
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

        {/* Step 2: Loading State (NEW!) */}
        {step === 2 && loading && (
          <div className="flex flex-col items-center justify-center py-16 px-8">
            {/* Spinner */}
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
              
              {/* Progress indicators */}
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
                <div key={index} className="border rounded-lg p-4 hover:border-blue-500 transition-colors">
                  <h3 className="font-bold mb-2 text-gray-900">{variation.title}</h3>
                  <p className="text-sm text-gray-600 mb-3">{variation.approach}</p>
                  
                  <div className="space-y-2 text-sm mb-4">
                    <div>
                      <strong className="text-gray-900">Materials:</strong>
                      <ul className="list-disc list-inside text-gray-600">
                        {variation.materials.slice(0, 3).map((m, i) => (
                          <li key={i}>{m}</li>
                        ))}
                      </ul>
                    </div>
                    
                    <div>
                      <strong className="text-gray-900">Activities:</strong>
                      <p className="text-gray-600">{variation.activities.length} activities</p>
                    </div>
                  </div>

                  <button
                    onClick={() => saveLesson(variation)}
                    disabled={loading}
                    className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:bg-blue-400"
                  >
                    {loading ? 'Saving...' : 'Choose This'}
                  </button>
                </div>
              ))}
            </div>

            {/* REGENERATE BUTTON */}
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

            {/* Close Button */}
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
    </div>
  );
}
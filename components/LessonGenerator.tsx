'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Child = {
  id: string;
  name: string;
  grade_level: string;
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

type Props = {
  children: Child[];
  onClose: () => void;
};

export default function LessonGenerator({ children, onClose }: Props) {
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
    learningObjectives: '',
    materials: '',
    learningStyle: '',
    surpriseMe: false
  });

  const handleChildSelect = (childId: string) => {
    const child = children.find(c => c.id === childId);
    if (child) {
      setFormData({
        ...formData,
        childId,
        childName: child.name,
        gradeLevel: child.grade_level
      });
    }
  };

  const generateLessons = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/generate-lesson', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      const data = await response.json();
      setVariations(data.variations);
      setStep(3);
    } catch (error) {
      console.error('Generation failed:', error);
      alert('Failed to generate lessons. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const saveLesson = async (variation: LessonVariation) => {
    try {
      // Call your existing lesson creation endpoint
      const response = await fetch('/api/lessons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          child_id: formData.childId,
          title: variation.title,
          subject: formData.subject,
          duration: formData.duration,
          description: JSON.stringify(variation),
          date: new Date().toISOString().split('T')[0]
        })
      });

      if (response.ok) {
        setSelectedVariation(variation);
        router.refresh();
      }
    } catch (error) {
      console.error('Save failed:', error);
      alert('Failed to save lesson. Please try again.');
    }
  };

  const adaptForAnotherChild = () => {
    // Show adaptation modal (implement separately)
    console.log('Adapt lesson for another child');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900"> 📚 Lesson Generator</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
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
                {children.map(child => (
  <option key={child.id} value={child.id}>
    {child.name}{child.grade_level ? ` (${child.grade_level})` : ''}
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
        {step === 2 && (
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

        {/* Step 3: Preview & Choose */}
        {step === 3 && variations.length > 0 && (
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
                    className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700"
                  >
                    Choose This
                  </button>
                </div>
              ))}
            </div>

            <button
  onClick={() => setStep(2)}
  className="w-full border border-gray-300 py-3 rounded-lg hover:bg-gray-50 text-gray-900"
>
  ← Start Over
</button>
          </div>
        )}

        {/* Success State */}
        {selectedVariation && (
          <div className="text-center space-y-4">
            <div className="text-green-600 text-5xl">✓</div>
            <h3 className="text-xl font-bold text-gray-900">Saved for {formData.childName}!</h3>
            <div className="space-y-2">
              <button
                onClick={adaptForAnotherChild}
                className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700"
              >
                Adapt this lesson for another child
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
      </div>
    </div>
  );
}
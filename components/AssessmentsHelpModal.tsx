'use client';

import { X, BookOpen, Target, Upload, CheckCircle, Sparkles } from 'lucide-react';

type AssessmentsHelpModalProps = {
  onClose: () => void;
};

export default function AssessmentsHelpModal({ onClose }: AssessmentsHelpModalProps) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-8 rounded-t-3xl">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-3xl font-black mb-2">📚 Assessments & Standards Guide</h2>
              <p className="text-white/80">Everything you need to know to track learning progress</p>
            </div>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-full transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="p-8 space-y-8">
          
          {/* Section 1: Overview */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-purple-100 flex items-center justify-center">
                <BookOpen className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="text-2xl font-black text-slate-900">What Are Assessments & Standards?</h3>
            </div>
            <div className="bg-purple-50 rounded-2xl p-6 border border-purple-100">
              <p className="text-slate-700 leading-relaxed mb-3">
                <strong className="text-purple-700">Assessments</strong> are quizzes and tests your child completes for their lessons. 
                <strong className="text-purple-700 ml-2">Standards</strong> are the learning goals (like "add fractions" or "analyze primary sources") that each assessment measures.
              </p>
              <p className="text-slate-600 leading-relaxed">
                By linking assessments to standards, you can track exactly which skills your child has mastered and which need more practice.
              </p>
            </div>
          </div>

          {/* Section 2: Assessment Results Tab */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 flex items-center justify-center">
                <Target className="w-6 h-6 text-emerald-600" />
              </div>
              <h3 className="text-2xl font-black text-slate-900">Assessment Results Tab</h3>
            </div>
            
            <div className="space-y-3">
              <div className="bg-white rounded-2xl p-5 border-2 border-slate-200">
                <h4 className="font-black text-slate-900 mb-2 flex items-center gap-2">
                  <span className="text-lg">1️⃣</span> View Your Child's Quiz Results
                </h4>
                <p className="text-slate-600">
                  See all completed assessments with scores. Each card shows the lesson name, student name, and percentage score.
                </p>
              </div>

              <div className="bg-white rounded-2xl p-5 border-2 border-slate-200">
                <h4 className="font-black text-slate-900 mb-2 flex items-center gap-2">
                  <span className="text-lg">2️⃣</span> Add Standards to Assessments
                </h4>
                <p className="text-slate-600 mb-3">
                  Click <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded font-bold text-sm">+ Add Standards</span> on any assessment to link it to learning goals.
                </p>
                <ul className="space-y-2 ml-4">
                  <li className="text-slate-600">• <strong>Search & Filter:</strong> Find standards by subject, grade, or keyword</li>
                  <li className="text-slate-600">• <strong>Set Alignment:</strong> Mark each standard as Primary, Supporting, or Related</li>
                  <li className="text-slate-600">• <strong>See Progress:</strong> Track which standards your child has practiced</li>
                </ul>
              </div>

              <div className="bg-amber-50 rounded-2xl p-5 border-2 border-amber-200">
                <h4 className="font-black text-amber-900 mb-2 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-amber-600" />
                  Pro Tip: Start Simple!
                </h4>
                <p className="text-amber-800">
                  Don't worry about adding standards to every assessment right away. Start with your most recent lessons and work backwards as time allows.
                </p>
              </div>
            </div>
          </div>

          {/* Section 3: Standards Tracking Tab */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-blue-100 flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-2xl font-black text-slate-900">Standards Tracking Tab</h3>
            </div>

            <div className="space-y-3">
              <div className="bg-white rounded-2xl p-5 border-2 border-slate-200">
                <h4 className="font-black text-slate-900 mb-2">Your Standards Library</h4>
                <p className="text-slate-600 mb-3">
                  This is your complete collection of learning standards. You currently have <strong>231 standards</strong> in your library!
                </p>
                <ul className="space-y-2 ml-4">
                  <li className="text-slate-600">• <strong>Filter by Subject/Grade:</strong> Narrow down to specific topics</li>
                  <li className="text-slate-600">• <strong>Search:</strong> Find standards by code or description</li>
                  <li className="text-slate-600">• <strong>Review:</strong> See exactly what skills you're tracking</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Section 4: Adding Standards */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-indigo-100 flex items-center justify-center">
                <Upload className="w-6 h-6 text-indigo-600" />
              </div>
              <h3 className="text-2xl font-black text-slate-900">How to Add More Standards</h3>
            </div>
            {/* Disclaimer Box */}
<div className="bg-amber-50 rounded-2xl p-5 border-2 border-amber-300 mb-4">
  <div className="flex items-start gap-3">
    <span className="text-2xl">⚠️</span>
    <div>
      <h4 className="font-black text-amber-900 mb-2">Important: Parent Responsibility</h4>
      <p className="text-amber-800 text-sm leading-relaxed">
        Standards are provided for convenience only. <strong>Parents are responsible for verifying the accuracy and currency of all standards</strong> with their state requirements, curriculum provider, or educational guidelines. HomeschoolHQ does not maintain or update standards - we provide tools for YOU to import and manage the standards that matter to your family.
      </p>
    </div>
  </div>
</div>

            <div className="space-y-3">
              <div className="bg-white rounded-2xl p-5 border-2 border-indigo-200">
                <h4 className="font-black text-indigo-900 mb-3 flex items-center gap-2">
                  <span className="text-2xl">✨</span> Method 1: AI Extraction (Recommended)
                </h4>
                <p className="text-slate-700 mb-3">
                  Click <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded font-bold text-sm">+ Import Standards</span> and let AI read standards from:
                </p>
                <ul className="space-y-2 ml-4 mb-3">
                  <li className="text-slate-600">• 📄 <strong>PDF files:</strong> Upload your curriculum documents</li>
                  <li className="text-slate-600">• 🔗 <strong>Website URLs:</strong> Paste a link to online standards</li>
                </ul>
                <div className="bg-indigo-50 rounded-xl p-4">
                  <p className="text-sm text-indigo-900 font-medium">
                    💡 The AI (Claude 3.5 Sonnet) will automatically extract standard codes, descriptions, subjects, and grade levels for you!
                  </p>
                </div>
              </div>

              <div className="bg-white rounded-2xl p-5 border-2 border-slate-200">
                <h4 className="font-black text-slate-900 mb-3">📚 Method 2: Browse Templates</h4>
                <p className="text-slate-600">
                  Click <span className="px-2 py-1 bg-slate-600 text-white rounded font-bold text-sm">Manage Standards</span> → Browse pre-loaded Common Core and state standards templates. Just select and import!
                </p>
              </div>

              <div className="bg-white rounded-2xl p-5 border-2 border-slate-200">
                <h4 className="font-black text-slate-900 mb-3">✏️ Method 3: Create Custom</h4>
                <p className="text-slate-600">
                  Click <span className="px-2 py-1 bg-slate-600 text-white rounded font-bold text-sm">Manage Standards</span> → Create your own standards for specialized curricula or unique learning goals.
                </p>
              </div>
            </div>
          </div>

          {/* Section 5: Common Questions */}
          <div className="space-y-4">
            <h3 className="text-2xl font-black text-slate-900">❓ Common Questions</h3>
            
            <div className="space-y-3">
              <details className="bg-slate-50 rounded-2xl p-5 border border-slate-200 cursor-pointer group">
                <summary className="font-black text-slate-900 list-none flex items-center justify-between">
                  Do I need to add standards to every assessment?
                  <span className="text-slate-400 group-open:rotate-180 transition-transform">▼</span>
                </summary>
                <p className="text-slate-600 mt-3 leading-relaxed">
                  No! Standards are optional. They're most helpful when you want to track specific skill mastery or prepare portfolio reports. Start with subjects that matter most to you.
                </p>
              </details>

              <details className="bg-slate-50 rounded-2xl p-5 border border-slate-200 cursor-pointer group">
                <summary className="font-black text-slate-900 list-none flex items-center justify-between">
                  What if I can't find the standards I need?
                  <span className="text-slate-400 group-open:rotate-180 transition-transform">▼</span>
                </summary>
                <p className="text-slate-600 mt-3 leading-relaxed">
                  Use the AI Import feature to extract standards from your curriculum PDFs or state education websites. You can also create custom standards that match your teaching goals.
                </p>
              </details>

              <details className="bg-slate-50 rounded-2xl p-5 border border-slate-200 cursor-pointer group">
                <summary className="font-black text-slate-900 list-none flex items-center justify-between">
                  Can I add multiple standards to one assessment?
                  <span className="text-slate-400 group-open:rotate-180 transition-transform">▼</span>
                </summary>
                <p className="text-slate-600 mt-3 leading-relaxed">
                  Yes! Most assessments cover multiple skills. You can mark which standards are "Primary" (main focus), "Supporting" (practiced but not main focus), or "Related" (tangentially covered).
                </p>
              </details>

              <details className="bg-slate-50 rounded-2xl p-5 border border-slate-200 cursor-pointer group">
                <summary className="font-black text-slate-900 list-none flex items-center justify-between">
                  How does this help with homeschool reporting?
                  <span className="text-slate-400 group-open:rotate-180 transition-transform">▼</span>
                </summary>
                <p className="text-slate-600 mt-3 leading-relaxed">
                  When you link assessments to standards, you're building documentation that shows exactly which learning objectives your child has covered. This is perfect for portfolios, progress reports, or state compliance requirements.
                </p>
              </details>
            </div>
          </div>

          {/* Quick Start Checklist */}
          <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-2xl p-6 border-2 border-purple-200">
            <h3 className="text-xl font-black text-purple-900 mb-4">🚀 Quick Start Checklist</h3>
            <div className="space-y-2">
              <label className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" className="mt-1 w-5 h-5 rounded border-purple-300" />
                <span className="text-slate-700">Import or create your first batch of standards (start with 10-20)</span>
              </label>
              <label className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" className="mt-1 w-5 h-5 rounded border-purple-300" />
                <span className="text-slate-700">Add standards to your 3 most recent assessments</span>
              </label>
              <label className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" className="mt-1 w-5 h-5 rounded border-purple-300" />
                <span className="text-slate-700">Review the standards library filters (subject/grade/search)</span>
              </label>
              <label className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" className="mt-1 w-5 h-5 rounded border-purple-300" />
                <span className="text-slate-700">Explore alignment strengths (Primary/Supporting/Related)</span>
              </label>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-slate-50 border-t border-slate-200 p-6 rounded-b-3xl">
          <button
            onClick={onClose}
            className="w-full py-4 bg-purple-600 hover:bg-purple-700 text-white rounded-2xl font-black transition-all"
          >
            Got It! Let's Get Started
          </button>
        </div>
      </div>
    </div>
  );
}
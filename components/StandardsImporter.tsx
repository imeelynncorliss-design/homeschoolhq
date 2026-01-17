// components/StandardsImporter.tsx
'use client';

import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

type ImportMethod = 'url' | 'file' | 'manual';

type StandardsImporterProps = {
  onClose: () => void;
  onImport: () => void;
};

export default function StandardsImporter({ onClose, onImport }: StandardsImporterProps) {
  const [method, setMethod] = useState<ImportMethod>('url');
  const [url, setUrl] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState('');

  // Manual entry fields
  const [manualStandard, setManualStandard] = useState({
    state_code: '',
    grade_level: '',
    subject: '',
    standard_code: '',
    description: '',
    domain: ''
  });
  const [creating, setCreating] = useState(false);

  const handleUrlImport = async () => {
    if (!url.trim()) {
      setError('Please enter a URL');
      return;
    }

    setProcessing(true);
    setProgress('Fetching webpage...');
    setError('');

    try {
      const supabase = createClient(supabaseUrl, supabaseKey);
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        setError('Please sign in to import standards');
        setProcessing(false);
        return;
      }

      setProgress('Analyzing content with AI...');

      const response = await fetch('/api/standards/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          type: 'url',
          url: url
        })
      });

      const result = await response.json();

      if (result.success) {
        alert(`Successfully imported ${result.data.count} standards!`);
        onImport();
        onClose();
      } else {
        setError(result.error?.message || 'Failed to import standards');
      }
    } catch (err: any) {
      console.error('Import error:', err);
      setError(err.message || 'Error importing standards');
    } finally {
      setProcessing(false);
      setProgress('');
    }
  };

  const handleFileImport = async () => {
    if (!file) {
      setError('Please select a file');
      return;
    }

    setProcessing(true);
    setProgress('Reading file...');
    setError('');

    try {
      const supabase = createClient(supabaseUrl, supabaseKey);
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        setError('Please sign in to import standards');
        setProcessing(false);
        return;
      }

      // Convert file to base64
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(',')[1]); // Remove data:image/png;base64, prefix
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      setProgress('Parsing standards with AI...');

      const response = await fetch('/api/standards/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          type: file.type.includes('pdf') ? 'pdf' : 'image',
          file: base64,
          filename: file.name
        })
      });

      const result = await response.json();

      if (result.success) {
        alert(`Successfully imported ${result.data.count} standards!`);
        onImport();
        onClose();
      } else {
        // Check for specific Anthropic PDF page limit error
        if (result.error?.message && result.error.message.includes('maximum of 100 PDF pages')) {
          setError('⚠️ PDF exceeds 100-page limit. Solutions: (1) Split PDF into smaller sections, (2) Screenshot specific pages you need, or (3) Use Manual Entry.');
        } else {
          setError(result.error?.message || 'Failed to import standards');
        }
      }
    } catch (err: any) {
      console.error('Import error:', err);
      // Also check for PDF page limit in catch block
      if (err.message && err.message.includes('maximum of 100 PDF pages')) {
        setError('⚠️ PDF exceeds 100-page limit. Solutions: (1) Split PDF into smaller sections, (2) Screenshot specific pages you need, or (3) Use Manual Entry.');
      } else {
        setError(err.message || 'Error importing standards');
      }
    } finally {
      setProcessing(false);
      setProgress('');
    }
  };

  const handleManualCreate = async () => {
    if (!manualStandard.grade_level || !manualStandard.subject || !manualStandard.description) {
      setError('Please fill in Grade Level, Subject, and Description');
      return;
    }

    setCreating(true);
    setError('');

    try {
      const supabase = createClient(supabaseUrl, supabaseKey);
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        setError('Please sign in to create standards');
        setCreating(false);
        return;
      }

      // Normalize state code to 2 characters
      let stateCode = manualStandard.state_code.trim().toUpperCase();
      if (stateCode.length > 2) {
        stateCode = stateCode.substring(0, 2);
      } else if (stateCode.length === 0) {
        stateCode = 'XX';
      }

      // Normalize grade level to single character if possible
      let gradeLevel = manualStandard.grade_level.trim().toUpperCase();
      if (gradeLevel === 'K' || gradeLevel === 'KINDERGARTEN') {
        gradeLevel = 'K';
      } else if (gradeLevel.match(/^\d+$/)) {
        gradeLevel = gradeLevel; // Keep as is if it's just a number
      } else if (gradeLevel.match(/^(\d+)-/)) {
        gradeLevel = gradeLevel.match(/^(\d+)-/)![1]; // Extract first number from range
      } else {
        gradeLevel = 'X'; // Unknown
      }

      const response = await fetch('/api/standards', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          state_code: stateCode,
          grade_level: gradeLevel,
          subject: manualStandard.subject,
          standard_code: manualStandard.standard_code || `CUSTOM-${Date.now()}`,
          description: manualStandard.description,
          domain: manualStandard.domain || 'Custom'
        })
      });

      const result = await response.json();

      if (result.success) {
        alert('Successfully created custom standard!');
        setManualStandard({
          state_code: '',
          grade_level: '',
          subject: '',
          standard_code: '',
          description: '',
          domain: ''
        });
        onImport();
      } else {
        setError(result.error?.message || 'Failed to create standard');
      }
    } catch (err: any) {
      console.error('Create error:', err);
      setError(err.message || 'Error creating standard');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-slate-200">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-2xl font-black text-slate-900">Import Standards</h2>
              <p className="text-sm text-slate-600 mt-1">
                Import standards directly from your state's official source
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 text-2xl font-bold"
            >
              ×
            </button>
          </div>

          {/* Disclaimer */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <p className="text-blue-900 text-sm">
              <strong>💡 You're in control:</strong> Import standards directly from your state's 
              official source. We use AI to parse and organize them, but you're responsible for 
              ensuring they match your state's current requirements.
            </p>
          </div>
        </div>

        {/* Method Selection Tabs */}
        <div className="border-b border-slate-200">
          <div className="flex">
            <button
              onClick={() => setMethod('url')}
              className={`flex-1 py-3 px-4 font-bold transition-colors ${
                method === 'url'
                  ? 'text-purple-600 border-b-2 border-purple-600'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              🌐 From URL
            </button>
            <button
              onClick={() => setMethod('file')}
              className={`flex-1 py-3 px-4 font-bold transition-colors ${
                method === 'file'
                  ? 'text-purple-600 border-b-2 border-purple-600'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              📄 From File
            </button>
            <button
              onClick={() => setMethod('manual')}
              className={`flex-1 py-3 px-4 font-bold transition-colors ${
                method === 'manual'
                  ? 'text-purple-600 border-b-2 border-purple-600'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              ✏️ Manual Entry
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* URL Import */}
          {method === 'url' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  State Standards URL
                </label>
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://www.cde.state.co.us/standards/..."
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-900"
                  disabled={processing}
                />
                <p className="text-xs text-slate-500 mt-2">
                  <strong>Examples:</strong> California DOE standards page, Texas TEKS website, 
                  Colorado Academic Standards
                </p>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                  <p className="text-red-900 text-sm font-medium">{error}</p>
                </div>
              )}

              {processing && (
                <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
                  <div className="flex items-center gap-3">
                    <div className="animate-spin h-5 w-5 border-2 border-purple-600 border-t-transparent rounded-full"></div>
                    <p className="text-purple-900 font-medium">{progress}</p>
                  </div>
                </div>
              )}

              <button
                onClick={handleUrlImport}
                disabled={processing || !url.trim()}
                className="w-full px-6 py-4 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {processing ? 'Importing...' : 'Import from URL'}
              </button>
            </div>
          )}

          {/* File Import */}
          {method === 'file' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  Upload PDF or Image
                </label>
                <input
                  type="file"
                  accept=".pdf,image/*"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-900"
                  disabled={processing}
                />
                <p className="text-xs text-slate-500 mt-2">
                  Upload a PDF document or screenshot of your state's standards. 
                  AI will extract and organize the standards automatically.
                </p>
                
                {/* PDF Page Limit Warning */}
                <div className="mt-3 bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <div className="flex gap-2">
                    <svg className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    <div className="text-xs">
                      <p className="font-semibold text-amber-900 mb-1">📄 PDF Page Limit: 100 pages maximum</p>
                      <p className="text-amber-800 leading-relaxed">
                        Large state standards documents often exceed 100 pages. If your PDF is too large:
                      </p>
                      <ul className="text-amber-800 mt-1 ml-4 space-y-0.5 list-disc">
                        <li><strong>Split the PDF</strong> - Extract just the grade/subject you need</li>
                        <li><strong>Screenshot pages</strong> - Upload images of specific pages instead</li>
                        <li><strong>Use Manual Entry</strong> - Enter standards individually</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              {file && (
                <>
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                    <p className="text-sm text-slate-700">
                      <strong>Selected:</strong> {file.name} ({(file.size / 1024).toFixed(0)} KB)
                    </p>
                  </div>
                  
                  {/* Large file warning */}
                  {file.type === 'application/pdf' && file.size > 10 * 1024 * 1024 && (
                    <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
                      <div className="flex gap-3">
                        <svg className="w-5 h-5 text-orange-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        <div className="text-sm">
                          <p className="font-bold text-orange-900">⚠️ Large PDF Detected ({(file.size / 1024 / 1024).toFixed(1)} MB)</p>
                          <p className="text-orange-800 mt-1">
                            This file is likely to exceed 100 pages. Consider splitting it into smaller sections or using screenshots instead.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                  <p className="text-red-900 text-sm font-medium">{error}</p>
                </div>
              )}

              {processing && (
                <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
                  <div className="flex items-center gap-3">
                    <div className="animate-spin h-5 w-5 border-2 border-purple-600 border-t-transparent rounded-full"></div>
                    <p className="text-purple-900 font-medium">{progress}</p>
                  </div>
                </div>
              )}

              <button
                onClick={handleFileImport}
                disabled={processing || !file}
                className="w-full px-6 py-4 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {processing ? 'Importing...' : 'Import from File'}
              </button>
            </div>
          )}

          {/* Manual Entry */}
          {method === 'manual' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">
                    State Code (2 chars)
                  </label>
                  <input
                    type="text"
                    value={manualStandard.state_code}
                    onChange={(e) => setManualStandard({ ...manualStandard, state_code: e.target.value })}
                    placeholder="CA, TX, NY..."
                    maxLength={2}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-900 uppercase"
                    disabled={creating}
                  />
                  <p className="text-xs text-slate-500 mt-1">2-letter state abbreviation</p>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">
                    Grade Level <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={manualStandard.grade_level}
                    onChange={(e) => setManualStandard({ ...manualStandard, grade_level: e.target.value })}
                    placeholder="K, 1, 2, 3..."
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-900"
                    required
                    disabled={creating}
                  />
                  <p className="text-xs text-slate-500 mt-1">K, P, or number 1-12</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  Subject <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={manualStandard.subject}
                  onChange={(e) => setManualStandard({ ...manualStandard, subject: e.target.value })}
                  placeholder="e.g., Mathematics, Science, History"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-900"
                  required
                  disabled={creating}
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  Standard Code (Optional)
                </label>
                <input
                  type="text"
                  value={manualStandard.standard_code}
                  onChange={(e) => setManualStandard({ ...manualStandard, standard_code: e.target.value })}
                  placeholder="Leave blank for auto-generated code"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-900"
                  disabled={creating}
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  Domain (Optional)
                </label>
                <input
                  type="text"
                  value={manualStandard.domain}
                  onChange={(e) => setManualStandard({ ...manualStandard, domain: e.target.value })}
                  placeholder="e.g., Number & Operations, Forces & Motion"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-900"
                  disabled={creating}
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={manualStandard.description}
                  onChange={(e) => setManualStandard({ ...manualStandard, description: e.target.value })}
                  placeholder="Describe what the student should know or be able to do..."
                  rows={4}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-900"
                  required
                  disabled={creating}
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                  <p className="text-red-900 text-sm font-medium">{error}</p>
                </div>
              )}

              <button
                onClick={handleManualCreate}
                disabled={creating || !manualStandard.grade_level || !manualStandard.subject || !manualStandard.description}
                className="w-full px-6 py-4 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {creating ? 'Creating...' : 'Create Custom Standard'}
              </button>
            </div>
          )}
        </div>

        {/* FAQ Section */}
        <div className="border-t border-slate-200 bg-slate-50">
          <div className="p-6 max-h-96 overflow-y-auto">
            <details className="group">
              <summary className="font-bold text-slate-900 cursor-pointer list-none flex items-center justify-between hover:text-purple-600 transition-colors">
                <span className="flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Frequently Asked Questions
                </span>
                <svg className="w-5 h-5 text-slate-400 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </summary>
              
              <div className="mt-4 space-y-4 text-sm">
                <div>
                  <h4 className="font-semibold text-slate-900 mb-1">Why does my PDF import fail with a page limit error?</h4>
                  <p className="text-slate-700">The AI can process a maximum of 100 pages per PDF. Many state standards documents contain 100+ pages. Solution: Split your PDF into smaller sections, screenshot specific pages, or use manual entry.</p>
                </div>

                <div>
                  <h4 className="font-semibold text-slate-900 mb-1">How do I split a large PDF?</h4>
                  <p className="text-slate-700">Use free tools like <a href="https://www.ilovepdf.com/split_pdf" target="_blank" rel="noopener noreferrer" className="text-purple-600 hover:underline">iLovePDF.com</a> or <a href="https://smallpdf.com/split-pdf" target="_blank" rel="noopener noreferrer" className="text-purple-600 hover:underline">SmallPDF.com</a>. Upload your PDF, select the pages you need (e.g., pages 25-50), and download the smaller file.</p>
                </div>

                <div>
                  <h4 className="font-semibold text-slate-900 mb-1">Can I upload images instead of PDFs?</h4>
                  <p className="text-slate-700">Yes! Screenshot the pages you need and upload them as PNG or JPG files. The AI extracts standards from images just like PDFs. Perfect when you only need a few pages.</p>
                </div>

                <div>
                  <h4 className="font-semibold text-slate-900 mb-1">What if the AI doesn't find any standards?</h4>
                  <p className="text-slate-700">This happens when the page is just a table of contents, the document is too complex, or standards aren't clearly formatted. Try a more specific section, a different page, or manual entry.</p>
                </div>

                <div>
                  <h4 className="font-semibold text-slate-900 mb-1">How accurate is the AI extraction?</h4>
                  <p className="text-slate-700">Very good at identifying codes, descriptions, and grade levels. However, you're responsible for verifying the standards match your state's current requirements. Always review before use.</p>
                </div>

                <div>
                  <h4 className="font-semibold text-slate-900 mb-1">Can I import from a website URL?</h4>
                  <p className="text-slate-700">Yes! Use the "From URL" tab. Best with HTML pages that list standards directly (not PDF links). Web pages don't have the 100-page PDF limit.</p>
                </div>
              </div>
            </details>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-200 flex justify-between items-center">
          <button
            onClick={onClose}
            className="px-6 py-3 text-slate-600 hover:text-slate-800 font-bold"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
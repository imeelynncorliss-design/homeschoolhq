'use client';

import React, { useState } from 'react';
import { Upload, Link as LinkIcon, FileText, X, ChevronDown, Loader2 } from 'lucide-react';

type StandardsImporterProps = {
  onClose: () => void;
  onImport?: (data: any) => void;
};

export default function StandardsImporter({ onClose, onImport}: StandardsImporterProps) {
  const [activeTab, setActiveTab] = useState('url');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [importUrl, setImportUrl] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleImport = async () => {
    setIsProcessing(true);
    setError(null);

    try {
      let payload: any = { type: activeTab };

      if (activeTab === 'url') {
        payload.url = importUrl;
      } else if (selectedFile) {
        const reader = new FileReader();
        const base64Promise = new Promise((resolve) => {
          reader.onload = () => resolve((reader.result as string).split(',')[1]);
        });
        reader.readAsDataURL(selectedFile);
        payload.file = await base64Promise;
        payload.type = selectedFile.type.includes('pdf') ? 'pdf' : 'image';
      }

      const response = await fetch('/api/standards/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'AI could not read this content');

      if (onImport) onImport(result.data);
      alert(`Success! Found ${result.data.count} standards.`);
      onClose();

    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsProcessing(false); 
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
    <div className="max-w-4xl w-full bg-white rounded-[2.5rem] shadow-2xl overflow-hidden relative border border-slate-100">
      
      {/* 1. LOADING OVERLAY */}
      {isProcessing && (
        <div className="absolute inset-0 z-[100] flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm">
          <div className="bg-white p-10 rounded-[2.5rem] shadow-2xl flex flex-col items-center border border-indigo-50">
            <Loader2 className="w-14 h-14 text-indigo-600 animate-spin" />
            <h3 className="mt-6 text-2xl font-black text-slate-800 tracking-tight">AI is Reading...</h3>
          </div>
        </div>
      )}

      {/* 2. HEADER */}
      <div className="p-8 pb-4 flex justify-between items-start">
        <div className={isProcessing ? "opacity-20 transition-opacity" : ""}>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight">Add Standards</h2>
          <p className="text-slate-500 mt-1 font-medium italic underline decoration-indigo-200">Claude 3.5 Sonnet Extraction</p>
        </div>
        <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
          <X className="w-6 h-6 text-slate-400" />
        </button>
      </div>

      {/* 3. CONTENT AREA */}
      <div className={`p-10 pt-4 space-y-8 ${isProcessing ? "opacity-20 blur-sm" : ""} transition-all duration-500`}>
        
        {error && (
          <div className="p-4 bg-red-50 border-2 border-red-100 rounded-2xl flex items-start justify-between gap-3">
            <div className="flex gap-3 text-red-700 text-sm font-medium">
              <X className="w-5 h-5 shrink-0" />
              <span>{error}</span>
            </div>
            <button onClick={() => setError(null)} className="text-xs font-bold text-red-400 uppercase tracking-widest">Clear</button>
          </div>
        )}

          <div className="flex gap-4 p-2 bg-slate-100 rounded-[2rem] border border-slate-200">
            {['url', 'file'].map(t => (
              <button 
                key={t}
                onClick={() => setActiveTab(t)}
                /* FIXED: Removed opacity issues and boosted contrast */
                className={`flex-1 py-4 px-6 rounded-[1.5rem] text-xs font-black tracking-[0.1em] uppercase transition-all duration-300 ${
                  activeTab === t 
                    ? 'bg-white shadow-md text-indigo-700' 
                    : 'text-slate-500 hover:text-indigo-600 hover:bg-white/50'
                }`}
              >
                {t === 'url' ? 'Web Link' : 'File Upload'}
              </button>
            ))}
          </div>

        {/* INPUT BOX - FIXED TEXT STYLE */}
        <div className="min-h-[140px]">
          {activeTab === 'url' ? (
            <div className="space-y-3">
              <label className="text-xs font-black text-slate-400 tracking-widest uppercase ml-2">Paste Website URL</label>
              <input
                type="url"
                placeholder="https://example.com/standards.pdf"
                /* Removed font-black to fix the "red dot" illegible text */
                className="w-full p-6 bg-slate-50 border-2 border-slate-200 rounded-[1.5rem] focus:border-indigo-500 focus:bg-white text-slate-700 text-lg font-medium leading-normal outline-none transition-all shadow-inner block"
                value={importUrl}
                onChange={(e) => setImportUrl(e.target.value)}
              />
            </div>
          ) : (
            <div 
              className="border-4 border-dashed border-slate-200 rounded-[2rem] p-12 text-center bg-slate-50/50 hover:bg-white hover:border-indigo-300 transition-all cursor-pointer group"
              onClick={() => document.getElementById('file-up')?.click()}
            >
              <input id="file-up" type="file" className="hidden" onChange={(e) => setSelectedFile(e.target.files?.[0] || null)} />
              <FileText className="w-12 h-12 text-indigo-300 mx-auto mb-4 group-hover:scale-110 group-hover:text-indigo-500 transition-all" />
              <p className="font-bold text-slate-700 text-lg">{selectedFile ? selectedFile.name : "Select Screenshot or PDF"}</p>
            </div>
          )}
        </div>

        <button 
          onClick={handleImport}
          disabled={isProcessing || (activeTab === 'url' ? !importUrl : !selectedFile)}
          className="w-full py-6 bg-indigo-600 hover:bg-indigo-700 text-white rounded-[2.5rem] font-black text-xl shadow-xl shadow-indigo-100 transition-all active:scale-[0.98] disabled:opacity-30 disabled:grayscale"
        >
          {isProcessing ? 'AI is working...' : 'Read Content with AI'}
        </button>
      </div>

      <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-between items-center px-10 font-bold tracking-widest text-[10px] text-slate-400 uppercase">
        Curriculum AI Assistant
        <ChevronDown className="w-5 h-5 text-slate-300" />
      </div>
    </div>
    </div>
  );
}
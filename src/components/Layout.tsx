import React from 'react';
import { FileText, Users, Settings, BarChart2, ChevronRight } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { AppStep } from '../types';

const STEPS: { key: AppStep; label: string; icon: React.ReactNode; description: string }[] = [
  { key: 'jd', label: 'Job Description', icon: <FileText size={18} />, description: 'Create or upload JD' },
  { key: 'resumes', label: 'Candidate Resumes', icon: <Users size={18} />, description: 'Upload & review resumes' },
  { key: 'config', label: 'Ranking Parameters', icon: <Settings size={18} />, description: 'Set priority weights' },
  { key: 'results', label: 'Ranking Results', icon: <BarChart2 size={18} />, description: 'View ranked candidates' },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const { step, setStep, jd, resumes } = useApp();

  function canNavigateTo(key: AppStep): boolean {
    if (key === 'jd') return true;
    if (key === 'resumes') return !!jd;
    if (key === 'config') return !!jd && resumes.length >= 2;
    if (key === 'results') return !!jd && resumes.length >= 2;
    return false;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-700 rounded flex items-center justify-center">
              <BarChart2 size={18} className="text-white" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-gray-900 leading-tight">Smart Resume Ranking</h1>
              <p className="text-xs text-gray-500">Recruiter Dashboard</p>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-2 text-xs text-gray-400">
            <span className="font-medium text-gray-600">Rule-Based Ranking Engine</span>
            <span className="text-gray-300">|</span>
            <span>v1.0</span>
          </div>
        </div>
      </header>

      <div className="flex flex-1 max-w-7xl mx-auto w-full px-6 py-6 gap-6">
        <aside className="w-64 shrink-0">
          <nav className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Workflow Steps</p>
            </div>
            <ul>
              {STEPS.map((s, idx) => {
                const active = step === s.key;
                const enabled = canNavigateTo(s.key);
                return (
                  <li key={s.key}>
                    <button
                      onClick={() => enabled && setStep(s.key)}
                      disabled={!enabled}
                      className={`w-full flex items-start gap-3 px-4 py-3 text-left transition-colors
                        ${active ? 'bg-blue-50 border-l-2 border-blue-700' : enabled ? 'hover:bg-gray-50 border-l-2 border-transparent cursor-pointer' : 'opacity-40 cursor-not-allowed border-l-2 border-transparent'}
                        ${idx < STEPS.length - 1 ? 'border-b border-gray-100' : ''}`}
                    >
                      <span className={`mt-0.5 shrink-0 ${active ? 'text-blue-700' : 'text-gray-400'}`}>{s.icon}</span>
                      <div className="min-w-0">
                        <div className={`text-sm font-medium ${active ? 'text-blue-700' : 'text-gray-700'}`}>
                          <span className="text-gray-400 mr-1">{idx + 1}.</span>{s.label}
                        </div>
                        <div className="text-xs text-gray-400 mt-0.5">{s.description}</div>
                      </div>
                      {active && <ChevronRight size={14} className="shrink-0 mt-0.5 text-blue-500 ml-auto" />}
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className="mt-4 bg-white border border-gray-200 rounded-lg p-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Current Session</p>
            <div className="space-y-2">
              <StatusRow label="Job Description" value={jd ? jd.title : 'Not set'} ok={!!jd} />
              <StatusRow label="Resumes" value={resumes.length ? `${resumes.length} uploaded` : 'None'} ok={resumes.length >= 2} />
              <StatusRow label="Min. Required" value="2 resumes" ok={resumes.length >= 2} />
            </div>
          </div>
        </aside>

        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  );
}

function StatusRow({ label, value, ok }: { label: string; value: string; ok: boolean }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-xs text-gray-500 truncate">{label}</span>
      <span className={`text-xs font-medium truncate max-w-[100px] ${ok ? 'text-green-700' : 'text-gray-400'}`}>{value}</span>
    </div>
  );
}

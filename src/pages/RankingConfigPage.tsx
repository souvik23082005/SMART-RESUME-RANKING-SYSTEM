import React, { useState } from 'react';
import { GripVertical, ArrowUp, ArrowDown, AlertCircle, Info } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { supabase } from '../lib/supabase';
import { ParameterKey, PriorityItem } from '../types';
import { PRIORITY_WEIGHTS } from '../lib/rankingEngine';

const PARAM_META: Record<ParameterKey, { label: string; desc: string; color: string; barColor: string }> = {
  experience: { label: 'Experience', desc: 'Years of relevant work experience', color: 'bg-blue-100 text-blue-800 border-blue-200', barColor: 'bg-blue-500' },
  education: { label: 'Education', desc: 'Academic qualification level', color: 'bg-purple-100 text-purple-800 border-purple-200', barColor: 'bg-purple-500' },
  location: { label: 'Location', desc: 'Geographic match with job location', color: 'bg-green-100 text-green-800 border-green-200', barColor: 'bg-green-500' },
  industry: { label: 'Industry', desc: 'Sector / domain experience match', color: 'bg-orange-100 text-orange-800 border-orange-200', barColor: 'bg-orange-400' },
  notice_period: { label: 'Notice Period', desc: 'Availability / joining timeline', color: 'bg-gray-100 text-gray-800 border-gray-200', barColor: 'bg-gray-400' },
};

const DEFAULT_ORDER: ParameterKey[] = ['experience', 'education', 'location', 'industry', 'notice_period'];

function buildItems(order: ParameterKey[]): PriorityItem[] {
  return order.map((key, idx) => ({ key, label: PARAM_META[key].label, priority: idx + 1 }));
}

export default function RankingConfigPage() {
  const { jd, resumes, setRankingConfig, setStep } = useApp();
  const [items, setItems] = useState<PriorityItem[]>(buildItems(DEFAULT_ORDER));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  function reorder(from: number, to: number) {
    const next = [...items];
    const [removed] = next.splice(from, 1);
    next.splice(to, 0, removed);
    setItems(next.map((item, i) => ({ ...item, priority: i + 1 })));
  }

  async function handleSaveAndRun() {
    if (!jd) return;
    setSaving(true);
    setError(null);
    const payload = {
      jd_id: jd.id,
      experience_priority: items.find((i) => i.key === 'experience')!.priority,
      education_priority: items.find((i) => i.key === 'education')!.priority,
      location_priority: items.find((i) => i.key === 'location')!.priority,
      industry_priority: items.find((i) => i.key === 'industry')!.priority,
      notice_period_priority: items.find((i) => i.key === 'notice_period')!.priority,
    };
    const { data, error: err } = await supabase.from('ranking_configs').insert(payload).select().maybeSingle();
    setSaving(false);
    if (err || !data) { setError(err?.message ?? 'Failed to save configuration.'); return; }
    setRankingConfig(data as any);
    setStep('results');
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Ranking Parameters</h2>
        <p className="text-sm text-gray-500 mt-1">Set the priority order of the five ranking parameters. Drag rows or use arrow buttons to reorder. Priority 1 carries the highest weight.</p>
      </div>

      <div className="mb-4 bg-blue-50 border border-blue-100 rounded-lg p-4 flex items-start gap-2">
        <Info size={15} className="shrink-0 mt-0.5 text-blue-600" />
        <div>
          <p className="text-xs font-semibold text-blue-800 mb-1">Automatic Weight Assignment</p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(PRIORITY_WEIGHTS).map(([p, w]) => (
              <span key={p} className="text-xs bg-white border border-blue-200 text-blue-700 rounded px-2 py-0.5">Priority {p} = {w}%</span>
            ))}
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-4 flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
          <AlertCircle size={14} />{error}
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden mb-6">
        <div className="grid grid-cols-[32px_1fr_100px_80px] items-center px-4 py-2 bg-gray-50 border-b border-gray-200">
          <span /><span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Parameter</span>
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide text-center">Weight</span>
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide text-center">Reorder</span>
        </div>
        {items.map((item, idx) => {
          const meta = PARAM_META[item.key];
          return (
            <div
              key={item.key}
              draggable
              onDragStart={() => setDragIdx(idx)}
              onDragEnter={() => setDragOverIdx(idx)}
              onDragEnd={() => { if (dragIdx !== null && dragOverIdx !== null && dragIdx !== dragOverIdx) reorder(dragIdx, dragOverIdx); setDragIdx(null); setDragOverIdx(null); }}
              onDragOver={(e) => e.preventDefault()}
              className={`grid grid-cols-[32px_1fr_100px_80px] items-center px-4 py-3 border-b border-gray-100 last:border-0 transition-colors cursor-grab
                ${dragIdx === idx ? 'opacity-40' : dragOverIdx === idx && dragIdx !== idx ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
            >
              <div className="flex items-center justify-center text-gray-300"><GripVertical size={16} /></div>
              <div className="flex items-center gap-3 min-w-0">
                <span className="w-6 h-6 rounded-full bg-blue-700 text-white text-xs font-bold flex items-center justify-center shrink-0">{item.priority}</span>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-800">{meta.label}</p>
                  <p className="text-xs text-gray-400 truncate">{meta.desc}</p>
                </div>
              </div>
              <div className="text-center">
                <span className={`inline-block text-xs font-semibold border rounded px-2 py-0.5 ${meta.color}`}>{PRIORITY_WEIGHTS[item.priority]}%</span>
              </div>
              <div className="flex items-center justify-center gap-1">
                <button onClick={() => reorder(idx, idx - 1)} disabled={idx === 0} className="p-1 rounded hover:bg-gray-200 text-gray-400 disabled:opacity-20"><ArrowUp size={14} /></button>
                <button onClick={() => reorder(idx, idx + 1)} disabled={idx === items.length - 1} className="p-1 rounded hover:bg-gray-200 text-gray-400 disabled:opacity-20"><ArrowDown size={14} /></button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Weight distribution bar */}
      <div className="mb-6 bg-white border border-gray-200 rounded-lg p-4">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Weight Distribution Preview</p>
        <div className="flex h-5 rounded overflow-hidden gap-0.5">
          {items.map((item) => (
            <div key={item.key} style={{ width: `${PRIORITY_WEIGHTS[item.priority]}%` }} className={`${PARAM_META[item.key].barColor} flex items-center justify-center`} title={`${PARAM_META[item.key].label}: ${PRIORITY_WEIGHTS[item.priority]}%`}>
              <span className="text-white text-xs font-bold">{PRIORITY_WEIGHTS[item.priority]}%</span>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-3 mt-2">
          {items.map((item) => (
            <div key={item.key} className="flex items-center gap-1 text-xs text-gray-600">
              <span className={`w-2.5 h-2.5 rounded-sm ${PARAM_META[item.key].barColor}`} />{PARAM_META[item.key].label}
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-400">{resumes.length} candidate{resumes.length !== 1 ? 's' : ''} will be ranked</p>
        <div className="flex gap-3">
          <button onClick={() => setStep('resumes')} className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded hover:bg-gray-50">← Back</button>
          <button onClick={handleSaveAndRun} disabled={saving} className="px-6 py-2 text-sm font-medium bg-blue-700 text-white rounded hover:bg-blue-800 disabled:opacity-60">{saving ? 'Saving...' : 'Save & Run Ranking →'}</button>
        </div>
      </div>
    </div>
  );
}

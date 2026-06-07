import React, { useEffect, useState } from 'react';
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement,
  Title, Tooltip, Legend, RadialLinearScale, PointElement, LineElement, Filler,
} from 'chart.js';
import { Bar, Radar } from 'react-chartjs-2';
import { Award, RefreshCw, AlertCircle, BarChart2, TableProperties } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { supabase } from '../lib/supabase';
import { runRankingEngine, PRIORITY_WEIGHTS } from '../lib/rankingEngine';
import { RankingResult } from '../types';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, RadialLinearScale, PointElement, LineElement, Filler);

type EnrichedResult = RankingResult & { resume_name: string };

const PARAM_LABELS: Record<string, string> = {
  experience_score: 'Experience', education_score: 'Education',
  location_score: 'Location', industry_score: 'Industry', notice_period_score: 'Notice Period',
};

const RANK_COLORS = ['#1e40af', '#1d4ed8', '#2563eb', '#3b82f6', '#60a5fa', '#93c5fd'];

export default function ResultsPage() {
  const { jd, resumes, rankingConfig, setRankingResults, setStep } = useApp();
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'table' | 'bar' | 'radar'>('table');
  const [enriched, setEnriched] = useState<EnrichedResult[]>([]);

  useEffect(() => { if (jd && resumes.length >= 2 && rankingConfig) runAndSave(); }, [rankingConfig]);

  async function runAndSave() {
    if (!jd || !rankingConfig) return;
    setRunning(true);
    setError(null);
    await supabase.from('ranking_results').delete().eq('config_id', rankingConfig.id);
    const scores = runRankingEngine(jd, resumes, rankingConfig);
    const rows = scores.map((s) => ({
      config_id: rankingConfig.id, resume_id: s.resume_id, jd_id: jd.id,
      experience_score: s.experience_score, education_score: s.education_score,
      location_score: s.location_score, industry_score: s.industry_score,
      notice_period_score: s.notice_period_score, total_score: s.total_score, rank: s.rank,
    }));
    const { data, error: insertErr } = await supabase.from('ranking_results').insert(rows).select();
    if (insertErr || !data) { setError(insertErr?.message ?? 'Failed to save results.'); setRunning(false); return; }
    setRankingResults(data as RankingResult[]);
    setEnriched(
      (data as RankingResult[])
        .sort((a, b) => a.rank - b.rank)
        .map((r) => ({ ...r, resume_name: resumes.find((res) => res.id === r.resume_id)?.candidate_name ?? 'Unknown' }))
    );
    setRunning(false);
  }

  if (running) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-700 rounded-full animate-spin mb-4" />
        <p className="text-sm font-medium text-gray-600">Running ranking engine...</p>
        <p className="text-xs text-gray-400 mt-1">Comparing candidates against JD requirements</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center py-16 text-center">
        <AlertCircle size={36} className="text-red-400 mb-3" />
        <p className="text-sm text-red-600 font-medium">{error}</p>
        <button onClick={runAndSave} className="mt-4 px-4 py-2 text-sm bg-blue-700 text-white rounded hover:bg-blue-800">Retry</button>
      </div>
    );
  }

  if (enriched.length === 0) return null;

  return (
    <div className="max-w-4xl">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Ranking Results</h2>
          <p className="text-sm text-gray-500 mt-1">{enriched.length} candidates ranked for <strong>{jd?.title}</strong></p>
        </div>
        <button onClick={() => setStep('config')} className="flex items-center gap-1.5 px-4 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50 text-gray-600">
          <RefreshCw size={14} /> Re-run with New Weights
        </button>
      </div>

      {/* Top 3 podium */}
      <div className={`grid gap-3 mb-6 ${enriched.length >= 3 ? 'grid-cols-3' : enriched.length === 2 ? 'grid-cols-2' : 'grid-cols-1 max-w-xs'}`}>
        {enriched.slice(0, Math.min(3, enriched.length)).map((r, i) => <PodiumCard key={r.id} result={r} position={i + 1} />)}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-4 gap-1">
        {([
          { key: 'table', label: 'Score Table', icon: <TableProperties size={14} /> },
          { key: 'bar', label: 'Bar Chart', icon: <BarChart2 size={14} /> },
          { key: 'radar', label: 'Parameter Radar', icon: <Award size={14} /> },
        ] as const).map((tab) => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === tab.key ? 'border-blue-700 text-blue-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {tab.icon}{tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'table' && <ScoreTable enriched={enriched} rankingConfig={rankingConfig} />}
      {activeTab === 'bar' && <BarChartView enriched={enriched} />}
      {activeTab === 'radar' && <RadarChartView enriched={enriched} />}

      {/* Config summary */}
      {rankingConfig && (
        <div className="mt-6 bg-gray-50 border border-gray-200 rounded-lg p-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Ranking Configuration Used</p>
          <div className="flex flex-wrap gap-2">
            {([
              { key: 'experience', priority: rankingConfig.experience_priority },
              { key: 'education', priority: rankingConfig.education_priority },
              { key: 'location', priority: rankingConfig.location_priority },
              { key: 'industry', priority: rankingConfig.industry_priority },
              { key: 'notice_period', priority: rankingConfig.notice_period_priority },
            ] as const).sort((a, b) => a.priority - b.priority).map(({ key, priority }) => (
              <span key={key} className="text-xs bg-white border border-gray-200 rounded px-2 py-1 text-gray-700">
                <span className="font-semibold text-blue-700">P{priority}</span> {PARAM_LABELS[`${key}_score`]} ({PRIORITY_WEIGHTS[priority]}%)
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function PodiumCard({ result, position }: { result: EnrichedResult; position: number }) {
  const icons = ['', '🥇', '🥈', '🥉'];
  const borders = ['', 'border-yellow-400', 'border-gray-300', 'border-orange-400'];
  const bg = ['', 'bg-yellow-50', 'bg-gray-50', 'bg-orange-50'];
  return (
    <div className={`border-2 ${borders[position]} ${bg[position]} rounded-lg p-4 text-center`}>
      <div className="text-2xl mb-1">{icons[position]}</div>
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Rank #{position}</p>
      <p className="text-sm font-bold text-gray-900 mt-1 truncate" title={result.resume_name}>{result.resume_name}</p>
      <p className="text-2xl font-bold text-blue-700 mt-2">{result.total_score}</p>
      <p className="text-xs text-gray-400">/ 100</p>
    </div>
  );
}

function ScoreTable({ enriched, rankingConfig }: { enriched: EnrichedResult[]; rankingConfig: any }) {
  return (
    <div className="overflow-x-auto bg-white border border-gray-200 rounded-lg">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200">
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Rank</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Candidate</th>
            {rankingConfig && <>
              <th className="px-3 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Exp. <Wt w={PRIORITY_WEIGHTS[rankingConfig.experience_priority]} /></th>
              <th className="px-3 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Edu. <Wt w={PRIORITY_WEIGHTS[rankingConfig.education_priority]} /></th>
              <th className="px-3 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Loc. <Wt w={PRIORITY_WEIGHTS[rankingConfig.location_priority]} /></th>
              <th className="px-3 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Ind. <Wt w={PRIORITY_WEIGHTS[rankingConfig.industry_priority]} /></th>
              <th className="px-3 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">NP. <Wt w={PRIORITY_WEIGHTS[rankingConfig.notice_period_priority]} /></th>
            </>}
            <th className="px-4 py-3 text-center text-xs font-semibold text-gray-900 uppercase tracking-wide">Total</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {enriched.map((r) => (
            <tr key={r.id} className={r.rank === 1 ? 'bg-blue-50' : 'hover:bg-gray-50'}>
              <td className="px-4 py-3">
                <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${r.rank === 1 ? 'bg-blue-700 text-white' : r.rank === 2 ? 'bg-gray-200 text-gray-700' : 'bg-gray-100 text-gray-600'}`}>{r.rank}</span>
              </td>
              <td className="px-4 py-3 font-medium text-gray-800">{r.resume_name}</td>
              <td className="px-3 py-3 text-center"><Pill score={r.experience_score} /></td>
              <td className="px-3 py-3 text-center"><Pill score={r.education_score} /></td>
              <td className="px-3 py-3 text-center"><Pill score={r.location_score} /></td>
              <td className="px-3 py-3 text-center"><Pill score={r.industry_score} /></td>
              <td className="px-3 py-3 text-center"><Pill score={r.notice_period_score} /></td>
              <td className="px-4 py-3 text-center"><span className="text-base font-bold text-blue-700">{r.total_score}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Wt({ w }: { w: number }) {
  return <span className="text-xs font-normal text-blue-600 normal-case">({w}%)</span>;
}

function Pill({ score }: { score: number }) {
  const cls = score >= 80 ? 'bg-green-100 text-green-800' : score >= 60 ? 'bg-blue-100 text-blue-800' : score >= 40 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800';
  return <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded ${cls}`}>{score}</span>;
}

function BarChartView({ enriched }: { enriched: EnrichedResult[] }) {
  const names = enriched.map((r) => r.resume_name);
  const datasets = [
    { label: 'Experience', data: enriched.map((r) => r.experience_score), backgroundColor: 'rgba(59,130,246,0.8)' },
    { label: 'Education', data: enriched.map((r) => r.education_score), backgroundColor: 'rgba(139,92,246,0.8)' },
    { label: 'Location', data: enriched.map((r) => r.location_score), backgroundColor: 'rgba(34,197,94,0.8)' },
    { label: 'Industry', data: enriched.map((r) => r.industry_score), backgroundColor: 'rgba(249,115,22,0.8)' },
    { label: 'Notice Period', data: enriched.map((r) => r.notice_period_score), backgroundColor: 'rgba(107,114,128,0.8)' },
  ];
  const barOpts = { responsive: true, plugins: { legend: { position: 'bottom' as const, labels: { font: { size: 11 }, boxWidth: 12 } }, tooltip: { mode: 'index' as const } }, scales: { x: { grid: { display: false }, ticks: { font: { size: 11 } } }, y: { min: 0, max: 100, ticks: { stepSize: 20, font: { size: 11 } } } } };
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-6">
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">Parameter Score Breakdown per Candidate</p>
        <Bar data={{ labels: names, datasets }} options={barOpts} />
      </div>
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">Total Weighted Score</p>
        <Bar data={{ labels: names, datasets: [{ label: 'Total Score', data: enriched.map((r) => r.total_score), backgroundColor: enriched.map((_, i) => RANK_COLORS[i] ?? '#93c5fd') }] }}
          options={{ responsive: true, plugins: { legend: { display: false } }, scales: { x: { grid: { display: false }, ticks: { font: { size: 11 } } }, y: { min: 0, max: 100, ticks: { stepSize: 20, font: { size: 11 } } } } }} />
      </div>
    </div>
  );
}

function RadarChartView({ enriched }: { enriched: EnrichedResult[] }) {
  const colors = [
    { bg: 'rgba(30,64,175,0.15)', border: 'rgba(30,64,175,0.9)' },
    { bg: 'rgba(220,38,38,0.15)', border: 'rgba(220,38,38,0.9)' },
    { bg: 'rgba(22,163,74,0.15)', border: 'rgba(22,163,74,0.9)' },
    { bg: 'rgba(202,138,4,0.15)', border: 'rgba(202,138,4,0.9)' },
    { bg: 'rgba(107,114,128,0.15)', border: 'rgba(107,114,128,0.9)' },
  ];
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">Candidate Comparison Radar</p>
      <div className="max-w-lg mx-auto">
        <Radar
          data={{
            labels: ['Experience', 'Education', 'Location', 'Industry', 'Notice Period'],
            datasets: enriched.map((r, i) => ({
              label: r.resume_name,
              data: [r.experience_score, r.education_score, r.location_score, r.industry_score, r.notice_period_score],
              backgroundColor: colors[i % colors.length].bg,
              borderColor: colors[i % colors.length].border,
              borderWidth: 2, pointRadius: 3,
            })),
          }}
          options={{ responsive: true, plugins: { legend: { position: 'bottom', labels: { font: { size: 11 }, boxWidth: 12 } } }, scales: { r: { min: 0, max: 100, ticks: { stepSize: 20, font: { size: 10 } }, pointLabels: { font: { size: 11 } } } } }}
        />
      </div>
    </div>
  );
}

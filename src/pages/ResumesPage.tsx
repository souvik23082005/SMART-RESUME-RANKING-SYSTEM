import React, { useState, useEffect } from 'react';
import { Upload, Edit2, Trash2, Check, X, AlertCircle, User, FileText } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { supabase } from '../lib/supabase';
import { extractTextFromFile, parseResumeText } from '../lib/fileParser';
import { Resume } from '../types';

const EDUCATION_OPTIONS = [
  '', '10th / SSC', '12th / HSC', 'Diploma', 'B.A', 'B.Com', 'B.Sc', 'BCA', 'BBA',
  'B.Tech / B.E', 'MBA', 'M.Tech / M.E', 'M.Sc', 'MCA', 'PhD / Doctorate',
];

const INDUSTRY_OPTIONS = [
  '', 'Information Technology', 'Software', 'Banking & Finance', 'Healthcare',
  'Pharmaceutical', 'Manufacturing', 'Retail / E-Commerce', 'Telecom',
  'Education', 'Consulting', 'Media & Advertising', 'Automotive',
  'FMCG', 'Real Estate', 'Hospitality', 'Logistics', 'Insurance',
  'Energy & Oil', 'Construction', 'Government', 'Other',
];

export default function ResumesPage() {
  const { jd, resumes, refreshResumes, setStep } = useApp();
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => { refreshResumes(); }, []);

  async function handleFiles(files: FileList) {
    if (!jd) return;
    setUploading(true);
    setUploadError(null);
    for (const file of Array.from(files)) {
      const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
      if (!['pdf', 'docx', 'doc', 'txt'].includes(ext)) {
        setUploadError(`"${file.name}" is not supported (PDF, DOCX, TXT only).`);
        continue;
      }
      try {
        const text = await extractTextFromFile(file);
        const parsed = parseResumeText(text);
        await supabase.from('resumes').insert({
          jd_id: jd.id,
          candidate_name: parsed.candidate_name || file.name.replace(/\.[^.]+$/, ''),
          education: parsed.education || null,
          experience_years: parsed.experience_years,
          location: parsed.location || null,
          industry: parsed.industry || null,
          notice_period_days: parsed.notice_period_days,
          raw_text: text,
          filename: file.name,
        });
      } catch (err: any) {
        setUploadError(`Error parsing "${file.name}": ${err.message}`);
      }
    }
    setUploading(false);
    await refreshResumes();
  }

  async function handleDelete(id: string) {
    if (!confirm('Remove this resume?')) return;
    await supabase.from('resumes').delete().eq('id', id);
    await refreshResumes();
  }

  return (
    <div className="max-w-3xl">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Candidate Resumes</h2>
          <p className="text-sm text-gray-500 mt-1">Upload at least 2 resumes. Extracted fields are fully editable.</p>
        </div>
        {jd && <div className="text-right text-xs text-gray-400"><p className="font-medium text-gray-600">{jd.title}</p><p>JD loaded</p></div>}
      </div>

      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); }}
        className={`border-2 border-dashed rounded-lg p-8 text-center mb-6 transition-colors ${dragOver ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-white hover:border-blue-400'}`}
      >
        <Upload size={32} className="mx-auto text-gray-300 mb-2" />
        <p className="text-sm text-gray-600 font-medium">
          Drag & drop resumes here, or{' '}
          <label className="text-blue-700 cursor-pointer hover:underline">
            browse files<input type="file" accept=".pdf,.docx,.doc,.txt" multiple className="hidden" onChange={(e) => e.target.files && handleFiles(e.target.files)} />
          </label>
        </p>
        <p className="text-xs text-gray-400 mt-1">PDF, DOCX, TXT — multiple files allowed</p>
        {uploading && <p className="text-xs text-blue-600 mt-3 animate-pulse">Parsing and saving resumes...</p>}
      </div>

      {uploadError && (
        <div className="mb-4 flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
          <AlertCircle size={15} className="shrink-0 mt-0.5" /><span className="flex-1">{uploadError}</span>
          <button onClick={() => setUploadError(null)}><X size={13} /></button>
        </div>
      )}

      {resumes.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-lg p-8 text-center text-sm text-gray-400">
          <FileText size={36} className="mx-auto mb-2 text-gray-200" />
          No resumes uploaded yet. Upload at least 2 to proceed.
        </div>
      ) : (
        <div className="space-y-3">
          {resumes.map((resume) =>
            editId === resume.id ? (
              <ResumeEditCard key={resume.id} resume={resume}
                onSave={async (updated) => { await supabase.from('resumes').update(updated).eq('id', resume.id); await refreshResumes(); setEditId(null); }}
                onCancel={() => setEditId(null)} />
            ) : (
              <ResumeViewCard key={resume.id} resume={resume} onEdit={() => setEditId(resume.id)} onDelete={() => handleDelete(resume.id)} />
            )
          )}
        </div>
      )}

      {resumes.length > 0 && resumes.length < 2 && (
        <p className="mt-4 text-sm text-amber-600 flex items-center gap-1"><AlertCircle size={14} /> Upload at least 1 more resume to enable ranking.</p>
      )}

      {resumes.length >= 2 && (
        <div className="mt-6 flex justify-end">
          <button onClick={() => setStep('config')} className="px-6 py-2 text-sm font-medium bg-blue-700 text-white rounded hover:bg-blue-800">
            Continue to Ranking Configuration →
          </button>
        </div>
      )}
    </div>
  );
}

function ResumeViewCard({ resume, onEdit, onDelete }: { resume: Resume; onEdit: () => void; onDelete: () => void }) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center shrink-0"><User size={16} className="text-gray-400" /></div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate">{resume.candidate_name || 'Unknown Candidate'}</p>
            <p className="text-xs text-gray-400 mt-0.5 truncate">{resume.filename}</p>
          </div>
        </div>
        <div className="flex gap-1 shrink-0">
          <button onClick={onEdit} className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-blue-600"><Edit2 size={14} /></button>
          <button onClick={onDelete} className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-red-600"><Trash2 size={14} /></button>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 sm:grid-cols-5 gap-2">
        <FieldBadge label="Education" value={resume.education} />
        <FieldBadge label="Experience" value={resume.experience_years != null ? `${resume.experience_years} yrs` : null} />
        <FieldBadge label="Location" value={resume.location} />
        <FieldBadge label="Industry" value={resume.industry} />
        <FieldBadge label="Notice" value={resume.notice_period_days != null ? `${resume.notice_period_days} days` : null} />
      </div>
    </div>
  );
}

function FieldBadge({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="bg-gray-50 rounded px-2 py-1.5">
      <p className="text-xs text-gray-400 leading-tight">{label}</p>
      <p className="text-xs font-medium text-gray-700 mt-0.5 leading-tight truncate">
        {value || <span className="text-gray-300 italic">Not found</span>}
      </p>
    </div>
  );
}

function ResumeEditCard({ resume, onSave, onCancel }: { resume: Resume; onSave: (updated: Partial<Resume>) => void; onCancel: () => void }) {
  const [form, setForm] = useState({
    candidate_name: resume.candidate_name ?? '',
    education: resume.education ?? '',
    experience_years: resume.experience_years != null ? String(resume.experience_years) : '',
    location: resume.location ?? '',
    industry: resume.industry ?? '',
    notice_period_days: resume.notice_period_days != null ? String(resume.notice_period_days) : '',
  });

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
      <p className="text-xs font-semibold text-blue-700 mb-3 uppercase tracking-wide">Editing: {resume.filename}</p>
      <div className="grid grid-cols-2 gap-3">
        <EF label="Candidate Name"><input value={form.candidate_name} onChange={(e) => setForm({ ...form, candidate_name: e.target.value })} className={ei()} placeholder="Full name" /></EF>
        <EF label="Education"><select value={form.education} onChange={(e) => setForm({ ...form, education: e.target.value })} className={ei()}>{EDUCATION_OPTIONS.map((o) => <option key={o} value={o}>{o || '— Not specified —'}</option>)}</select></EF>
        <EF label="Experience (Years)"><input type="number" min="0" step="0.5" value={form.experience_years} onChange={(e) => setForm({ ...form, experience_years: e.target.value })} className={ei()} placeholder="e.g. 4" /></EF>
        <EF label="Location"><input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} className={ei()} placeholder="City" /></EF>
        <EF label="Industry"><select value={form.industry} onChange={(e) => setForm({ ...form, industry: e.target.value })} className={ei()}>{INDUSTRY_OPTIONS.map((o) => <option key={o} value={o}>{o || '— Not specified —'}</option>)}</select></EF>
        <EF label="Notice Period (Days)"><input type="number" min="0" value={form.notice_period_days} onChange={(e) => setForm({ ...form, notice_period_days: e.target.value })} className={ei()} placeholder="e.g. 30" /></EF>
      </div>
      <div className="flex justify-end gap-2 mt-4">
        <button onClick={onCancel} className="px-3 py-1.5 text-xs text-gray-600 border border-gray-300 rounded hover:bg-gray-50 flex items-center gap-1"><X size={12} /> Cancel</button>
        <button onClick={() => onSave({ candidate_name: form.candidate_name || null, education: form.education || null, experience_years: form.experience_years ? Number(form.experience_years) : null, location: form.location || null, industry: form.industry || null, notice_period_days: form.notice_period_days ? Number(form.notice_period_days) : null })} className="px-3 py-1.5 text-xs font-medium bg-blue-700 text-white rounded hover:bg-blue-800 flex items-center gap-1"><Check size={12} /> Save Changes</button>
      </div>
    </div>
  );
}

function EF({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>{children}</div>;
}

function ei() { return 'w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white'; }

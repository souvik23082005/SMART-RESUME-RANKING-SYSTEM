import React, { useState } from 'react';
import { FileText, Upload, PlusCircle, CheckCircle, AlertCircle, X } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { supabase } from '../lib/supabase';
import { extractTextFromFile, parseJDText } from '../lib/fileParser';

type Mode = 'choose' | 'manual' | 'upload';

const EDUCATION_OPTIONS = [
  'Any', '10th / SSC', '12th / HSC', 'Diploma', 'B.A', 'B.Com', 'B.Sc', 'BCA', 'BBA',
  'B.Tech / B.E', 'MBA', 'M.Tech / M.E', 'M.Sc', 'MCA', 'PhD / Doctorate',
];

const INDUSTRY_OPTIONS = [
  'Information Technology', 'Software', 'Banking & Finance', 'Healthcare',
  'Pharmaceutical', 'Manufacturing', 'Retail / E-Commerce', 'Telecom',
  'Education', 'Consulting', 'Media & Advertising', 'Automotive',
  'FMCG', 'Real Estate', 'Hospitality', 'Logistics', 'Insurance',
  'Energy & Oil', 'Construction', 'Government', 'Other',
];

interface ManualJD {
  title: string;
  required_education: string;
  required_experience_years: string;
  required_location: string;
  industry: string;
  notice_period_days: string;
}

const DEFAULT_MANUAL: ManualJD = {
  title: '', required_education: 'Any', required_experience_years: '',
  required_location: '', industry: '', notice_period_days: '',
};

export default function JDPage() {
  const { setJd, setStep } = useApp();
  const [mode, setMode] = useState<Mode>('choose');
  const [form, setForm] = useState<ManualJD>(DEFAULT_MANUAL);
  const [errors, setErrors] = useState<Partial<ManualJD>>({});
  const [uploading, setUploading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [parsedFromFile, setParsedFromFile] = useState<boolean>(false);
  const [fileRawText, setFileRawText] = useState('');
  const [fileName, setFileName] = useState('');

  function validate(): boolean {
    const e: Partial<ManualJD> = {};
    if (!form.title.trim()) e.title = 'Job title is required';
    if (form.required_experience_years && isNaN(Number(form.required_experience_years)))
      e.required_experience_years = 'Must be a number';
    if (form.notice_period_days && isNaN(Number(form.notice_period_days)))
      e.notice_period_days = 'Must be a number';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function saveJD(isUpload: boolean) {
    if (!validate()) return;
    setUploading(true);
    setFeedback(null);
    const payload = {
      title: form.title.trim(),
      required_education: form.required_education === 'Any' ? null : form.required_education,
      required_experience_years: form.required_experience_years ? Number(form.required_experience_years) : null,
      required_location: form.required_location.trim() || null,
      industry: form.industry || null,
      notice_period_days: form.notice_period_days ? Number(form.notice_period_days) : null,
      raw_text: isUpload ? fileRawText : null,
      source: isUpload ? 'upload' : 'manual',
    };
    const { data, error } = await supabase.from('job_descriptions').insert(payload).select().maybeSingle();
    setUploading(false);
    if (error || !data) { setFeedback({ type: 'error', msg: error?.message ?? 'Failed to save.' }); return; }
    setJd(data as any);
    setFeedback({ type: 'success', msg: 'Job description saved.' });
    setTimeout(() => setStep('resumes'), 700);
  }

  async function handleFile(file: File) {
    const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
    if (!['pdf', 'docx', 'doc', 'txt'].includes(ext)) {
      setFeedback({ type: 'error', msg: 'Only PDF, DOCX, or TXT files are supported.' });
      return;
    }
    setUploading(true);
    setFeedback(null);
    try {
      const text = await extractTextFromFile(file);
      const parsed = parseJDText(text);
      setFileRawText(text);
      setFileName(file.name);
      setForm({
        title: file.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' '),
        required_education: parsed.required_education ?? 'Any',
        required_experience_years: parsed.required_experience_years != null ? String(parsed.required_experience_years) : '',
        required_location: parsed.required_location ?? '',
        industry: parsed.industry ?? '',
        notice_period_days: parsed.notice_period_days != null ? String(parsed.notice_period_days) : '',
      });
      setParsedFromFile(true);
      setMode('upload');
    } catch (err: any) {
      setFeedback({ type: 'error', msg: err.message ?? 'Failed to parse file.' });
    } finally {
      setUploading(false);
    }
  }

  if (mode === 'choose') {
    return (
      <div className="max-w-2xl">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Job Description</h2>
          <p className="text-sm text-gray-500 mt-1">Choose how you'd like to add the job description.</p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <ModeCard icon={<PlusCircle size={28} className="text-blue-700" />} title="Create Manually" desc="Fill in job requirements using a structured form." onClick={() => setMode('manual')} />
          <ModeCard icon={<Upload size={28} className="text-blue-700" />} title="Upload JD File" desc="Upload a PDF, DOCX, or TXT — details extracted automatically." onClick={() => setMode('upload')} />
        </div>
      </div>
    );
  }

  if (mode === 'upload' && !parsedFromFile) {
    return (
      <div className="max-w-xl">
        <PageHeader title="Upload Job Description" subtitle="Upload a PDF, DOCX, or TXT. Key details will be extracted automatically." onBack={() => setMode('choose')} />
        {feedback && <FeedbackBanner {...feedback} onClose={() => setFeedback(null)} />}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
          className={`mt-6 border-2 border-dashed rounded-lg p-12 text-center transition-colors ${dragOver ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-white hover:border-blue-400'}`}
        >
          <Upload size={36} className="mx-auto text-gray-300 mb-3" />
          <p className="text-sm font-medium text-gray-600">
            Drag & drop your JD file here, or{' '}
            <label className="text-blue-700 cursor-pointer hover:underline">
              browse<input type="file" accept=".pdf,.docx,.doc,.txt" className="hidden" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
            </label>
          </p>
          <p className="text-xs text-gray-400 mt-2">Supported: PDF, DOCX, TXT</p>
          {uploading && <p className="text-xs text-blue-600 mt-4 animate-pulse">Parsing file...</p>}
        </div>
      </div>
    );
  }

  const isUploadMode = mode === 'upload';
  return (
    <div className="max-w-2xl">
      <PageHeader
        title={isUploadMode ? 'Review Extracted Details' : 'Create Job Description'}
        subtitle={isUploadMode ? `Extracted from "${fileName}". Review and correct before saving.` : 'Fill in job requirements. Job Title is required; all other fields are optional.'}
        onBack={() => { setMode('choose'); setParsedFromFile(false); setForm(DEFAULT_MANUAL); }}
      />
      {feedback && <FeedbackBanner {...feedback} onClose={() => setFeedback(null)} />}
      <form onSubmit={(e) => { e.preventDefault(); saveJD(isUploadMode); }} className="mt-6 bg-white border border-gray-200 rounded-lg divide-y divide-gray-100">
        <Section title="Role Information">
          <Field label="Job Title" required error={errors.title}>
            <input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Senior Software Engineer" className={ic(!!errors.title)} />
          </Field>
          <Field label="Industry">
            <select value={form.industry} onChange={(e) => setForm({ ...form, industry: e.target.value })} className={ic(false)}>
              <option value="">— Select Industry —</option>
              {INDUSTRY_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </Field>
        </Section>
        <Section title="Requirements">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Min. Experience (Years)" error={errors.required_experience_years}>
              <input type="number" min="0" step="0.5" value={form.required_experience_years} onChange={(e) => setForm({ ...form, required_experience_years: e.target.value })} placeholder="e.g. 3" className={ic(!!errors.required_experience_years)} />
            </Field>
            <Field label="Education Qualification">
              <select value={form.required_education} onChange={(e) => setForm({ ...form, required_education: e.target.value })} className={ic(false)}>
                {EDUCATION_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            </Field>
            <Field label="Location">
              <input type="text" value={form.required_location} onChange={(e) => setForm({ ...form, required_location: e.target.value })} placeholder="e.g. Bangalore" className={ic(false)} />
            </Field>
            <Field label="Max Notice Period (Days)" error={errors.notice_period_days}>
              <input type="number" min="0" value={form.notice_period_days} onChange={(e) => setForm({ ...form, notice_period_days: e.target.value })} placeholder="e.g. 30 (0 = immediate)" className={ic(!!errors.notice_period_days)} />
            </Field>
          </div>
        </Section>
        <div className="px-6 py-4 flex justify-end gap-3">
          <button type="button" onClick={() => { setMode('choose'); setParsedFromFile(false); setForm(DEFAULT_MANUAL); }} className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded hover:bg-gray-50">Cancel</button>
          <button type="submit" disabled={uploading} className="px-6 py-2 text-sm font-medium bg-blue-700 text-white rounded hover:bg-blue-800 disabled:opacity-60">{uploading ? 'Saving...' : 'Save & Continue'}</button>
        </div>
      </form>
    </div>
  );
}

function PageHeader({ title, subtitle, onBack }: { title: string; subtitle: string; onBack?: () => void }) {
  return (
    <div className="flex items-start gap-3">
      {onBack && <button onClick={onBack} className="mt-1 text-sm text-gray-400 hover:text-gray-600">← Back</button>}
      <div>
        <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
        <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
      </div>
    </div>
  );
}

function ModeCard({ icon, title, desc, onClick }: { icon: React.ReactNode; title: string; desc: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="bg-white border border-gray-200 rounded-lg p-6 text-left hover:border-blue-400 hover:shadow-sm transition-all group">
      <div className="mb-3">{icon}</div>
      <h3 className="text-sm font-semibold text-gray-800 group-hover:text-blue-700">{title}</h3>
      <p className="text-xs text-gray-500 mt-1 leading-relaxed">{desc}</p>
    </button>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="px-6 py-5">
      <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">{title}</h4>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function Field({ label, required, error, children }: { label: string; required?: boolean; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}{required && <span className="text-red-500 ml-1">*</span>}</label>
      {children}
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  );
}

function FeedbackBanner({ type, msg, onClose }: { type: 'success' | 'error'; msg: string; onClose: () => void }) {
  return (
    <div className={`mt-4 flex items-start gap-2 p-3 rounded border text-sm ${type === 'success' ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
      {type === 'success' ? <CheckCircle size={16} className="shrink-0 mt-0.5" /> : <AlertCircle size={16} className="shrink-0 mt-0.5" />}
      <span className="flex-1">{msg}</span>
      <button onClick={onClose}><X size={14} /></button>
    </div>
  );
}

function ic(hasError: boolean) {
  return `w-full px-3 py-2 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 ${hasError ? 'border-red-400' : 'border-gray-300'}`;
}

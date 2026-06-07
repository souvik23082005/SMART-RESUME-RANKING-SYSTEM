import * as pdfjsLib from 'pdfjs-dist';
import mammoth from 'mammoth';
import { ParsedResumeFields } from '../types';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

export async function extractTextFromFile(file: File): Promise<string> {
  const ext = file.name.split('.').pop()?.toLowerCase();

  if (ext === 'txt') {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve((e.target?.result as string) ?? '');
      reader.onerror = reject;
      reader.readAsText(file);
    });
  }

  if (ext === 'pdf') {
    const buffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
    const pages: string[] = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      pages.push(content.items.map((item: any) => item.str).join(' '));
    }
    return pages.join('\n');
  }

  if (ext === 'docx' || ext === 'doc') {
    const buffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer: buffer });
    return result.value;
  }

  throw new Error(`Unsupported file type: .${ext}`);
}

const EDUCATION_LEVELS: Record<string, number> = {
  phd: 7, doctorate: 7, 'ph.d': 7,
  mba: 6, mtech: 6, 'm.tech': 6, msc: 6, 'm.sc': 6, mca: 6, me: 6, 'm.e': 6,
  ma: 5,
  btech: 4, 'b.tech': 4, be: 4, 'b.e': 4,
  bsc: 3, 'b.sc': 3, bca: 3, bba: 3, ba: 3, 'b.a': 3, bcom: 3, 'b.com': 3,
  diploma: 2,
  '12th': 1, hsc: 1,
  '10th': 0, ssc: 0,
};

export function getEducationLevel(edu: string): number {
  if (!edu) return -1;
  const lower = edu.toLowerCase().replace(/\s+/g, '');
  for (const [key, level] of Object.entries(EDUCATION_LEVELS)) {
    if (lower.includes(key.replace(/\s+/g, ''))) return level;
  }
  return -1;
}

const EDUCATION_PATTERNS = [
  /\b(ph\.?d\.?|doctorate)\b/i,
  /\b(m\.?b\.?a\.?)\b/i,
  /\b(m\.?tech\.?|m\.?e\.?)\b/i,
  /\b(m\.?sc\.?|m\.?c\.?a\.?)\b/i,
  /\b(b\.?tech\.?|b\.?e\.?)\b/i,
  /\b(b\.?sc\.?|b\.?c\.?a\.?|b\.?b\.?a\.?|b\.?com\.?|b\.?a\.?)\b/i,
  /\b(diploma)\b/i,
];

const EXPERIENCE_PATTERNS = [
  /(\d+(?:\.\d+)?)\s*(?:\+\s*)?years?\s*(?:of\s+)?(?:work\s+)?experience/i,
  /experience\s*(?:of\s*)?(\d+(?:\.\d+)?)\s*(?:\+\s*)?years?/i,
  /(\d+(?:\.\d+)?)\s*(?:\+\s*)?yrs?\s*(?:of\s+)?(?:work\s+)?exp(?:erience)?/i,
];

const NOTICE_PATTERNS = [
  /notice\s*period\s*(?:of\s*|:?\s*)?(\d+)\s*(days?|months?|weeks?)/i,
  /(\d+)\s*(days?|months?|weeks?)\s*notice/i,
];

// Each entry: [canonical display name, ...aliases/abbreviations to match]
const CITY_ALIASES: [string, ...string[]][] = [
  ['Mumbai', 'mumbai', 'bombay', 'navi mumbai', 'thane'],
  ['Delhi', 'delhi', 'new delhi', 'ncr', 'n.c.r'],
  ['Bangalore', 'bangalore', 'bengaluru', 'bengalore', 'blr', 'blore'],
  ['Hyderabad', 'hyderabad', 'hyd', 'hyderabad city', 'secunderabad'],
  ['Ahmedabad', 'ahmedabad', 'amdavad'],
  ['Chennai', 'chennai', 'madras', 'chn'],
  ['Kolkata', 'kolkata', 'calcutta', 'kolkatta'],
  ['Pune', 'pune', 'pimpri', 'pcmc'],
  ['Jaipur', 'jaipur'],
  ['Surat', 'surat'],
  ['Lucknow', 'lucknow'],
  ['Kanpur', 'kanpur'],
  ['Nagpur', 'nagpur'],
  ['Indore', 'indore'],
  ['Bhopal', 'bhopal'],
  ['Visakhapatnam', 'visakhapatnam', 'vizag', 'vishakhapatnam'],
  ['Patna', 'patna'],
  ['Vadodara', 'vadodara', 'baroda'],
  ['Ghaziabad', 'ghaziabad'],
  ['Ludhiana', 'ludhiana'],
  ['Agra', 'agra'],
  ['Nashik', 'nashik', 'nasik'],
  ['Faridabad', 'faridabad'],
  ['Noida', 'noida'],
  ['Gurugram', 'gurugram', 'gurgaon'],
  ['Howrah', 'howrah'],
  ['Coimbatore', 'coimbatore', 'cbe'],
  ['Kochi', 'kochi', 'cochin', 'ernakulam'],
  ['Mysore', 'mysore', 'mysuru'],
  ['Chandigarh', 'chandigarh', 'mohali', 'tricity'],
  ['Bhubaneswar', 'bhubaneswar', 'bhubaneshwar'],
  ['Trivandrum', 'trivandrum', 'thiruvananthapuram'],
  ['Mangalore', 'mangalore', 'mangaluru'],
  ['Rajkot', 'rajkot'],
  ['Varanasi', 'varanasi', 'banaras'],
  ['Amritsar', 'amritsar'],
  ['Dehradun', 'dehradun'],
  ['Ranchi', 'ranchi'],
  ['Guwahati', 'guwahati'],
  ['Jodhpur', 'jodhpur'],
  ['Raipur', 'raipur'],
  // Global cities
  ['New York', 'new york', 'nyc'],
  ['London', 'london'],
  ['Singapore', 'singapore'],
  ['Dubai', 'dubai'],
  ['San Francisco', 'san francisco', 'sf', 'bay area'],
  ['Seattle', 'seattle'],
  ['Boston', 'boston'],
  ['Chicago', 'chicago'],
  ['Austin', 'austin'],
  ['Toronto', 'toronto'],
  ['Sydney', 'sydney'],
  ['Melbourne', 'melbourne'],
];

// Flat lookup: alias (lowercase) → canonical name
const CITY_LOOKUP = new Map<string, string>();
for (const [canonical, ...aliases] of CITY_ALIASES) {
  for (const alias of aliases) {
    CITY_LOOKUP.set(alias.toLowerCase(), canonical);
  }
}

// Patterns for labeled location fields in a resume
const LOCATION_LABEL_PATTERNS = [
  /(?:location|city|address|residence|residing\s+at|based\s+(?:in|at|out\s+of))\s*[:\-–]\s*([^\n,|•]{2,40})/i,
  /(?:^|\n)\s*([A-Za-z][A-Za-z\s]{2,25}),\s*(?:India|Maharashtra|Karnataka|Tamil\s+Nadu|Telangana|Gujarat|UP|Uttar\s+Pradesh|West\s+Bengal|Rajasthan|Punjab|Haryana|Kerala|Odisha|Bihar|Madhya\s+Pradesh|Andhra\s+Pradesh)/i,
];

// Pin-code pattern often appears near a city name: "Pune - 411001"
const PINCODE_NEARBY_PATTERN = /([A-Za-z][A-Za-z\s]{2,20})\s*[-–]?\s*\d{6}\b/;

function resolveCity(raw: string): string | null {
  const token = raw.trim().toLowerCase();
  // Direct lookup
  if (CITY_LOOKUP.has(token)) return CITY_LOOKUP.get(token)!;
  // Partial: does any known alias appear inside this token?
  for (const [alias, canonical] of CITY_LOOKUP.entries()) {
    if (token.includes(alias)) return canonical;
  }
  return null;
}

function extractLocation(text: string): string {
  // 1. Try labeled field patterns first (most reliable)
  for (const pattern of LOCATION_LABEL_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      const candidate = match[1] || match[2] || '';
      const resolved = resolveCity(candidate);
      if (resolved) return resolved;
      // Return the raw label value if it looks like a city (title-case word)
      const trimmed = candidate.trim();
      if (/^[A-Z][a-z]/.test(trimmed) && trimmed.length < 30) return trimmed;
    }
  }

  // 2. Pin-code proximity (city name directly before a 6-digit pin)
  const pinMatch = text.match(PINCODE_NEARBY_PATTERN);
  if (pinMatch) {
    const resolved = resolveCity(pinMatch[1]);
    if (resolved) return resolved;
  }

  // 3. Full-text scan — check each line for city tokens (case-insensitive)
  const textLower = text.toLowerCase();

  // Sort aliases longest-first to prefer specific matches (e.g. "navi mumbai" before "mumbai")
  const sortedAliases = [...CITY_LOOKUP.entries()].sort((a, b) => b[0].length - a[0].length);

  // Scan line by line so we can weight matches appearing in the top portion of the resume
  const lines = text.split('\n');
  const topLines = lines.slice(0, Math.ceil(lines.length * 0.4)).join('\n').toLowerCase();
  const bottomText = textLower;

  for (const [alias, canonical] of sortedAliases) {
    // Prefer a word-boundary match to avoid false positives (e.g. "Agra" inside "Agra-based")
    const re = new RegExp(`(?<![a-z])${alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![a-z])`, 'i');
    if (re.test(topLines)) return canonical;
  }
  // Fallback: scan full text
  for (const [alias, canonical] of sortedAliases) {
    const re = new RegExp(`(?<![a-z])${alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![a-z])`, 'i');
    if (re.test(bottomText)) return canonical;
  }

  return '';
}

const INDUSTRIES = [
  'information technology', 'it', 'software', 'banking', 'finance',
  'healthcare', 'manufacturing', 'retail', 'e-commerce', 'ecommerce',
  'telecom', 'telecommunications', 'education', 'consulting', 'media',
  'advertising', 'automotive', 'pharma', 'pharmaceutical', 'fmcg',
  'real estate', 'hospitality', 'logistics', 'supply chain', 'insurance',
  'energy', 'oil and gas', 'construction', 'legal', 'government',
];

export function parseResumeText(text: string): ParsedResumeFields {
  const textLower = text.toLowerCase();

  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);

  let candidate_name = '';
  for (const line of lines.slice(0, 5)) {
    if (!line.match(/@|http|www|\d{10}|\+91/) && line.length > 2 && line.length < 60) {
      candidate_name = line;
      break;
    }
  }

  let education = '';
  for (const pattern of EDUCATION_PATTERNS) {
    const match = text.match(pattern);
    if (match) { education = match[0].toUpperCase().replace(/\./g, ''); break; }
  }

  let experience_years: number | null = null;
  for (const pattern of EXPERIENCE_PATTERNS) {
    const match = text.match(pattern);
    if (match) { experience_years = parseFloat(match[1]); break; }
  }

  const location = extractLocation(text);

  let industry = '';
  for (const ind of INDUSTRIES) {
    if (textLower.includes(ind)) {
      industry = ind.split(' ').map((w) => w[0].toUpperCase() + w.slice(1)).join(' ');
      break;
    }
  }

  let notice_period_days: number | null = null;
  if (text.match(/immediately\s*available|immediate\s*joiner/i)) {
    notice_period_days = 0;
  } else {
    for (const pattern of NOTICE_PATTERNS) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const val = parseInt(match[1], 10);
        const unit = (match[2] || '').toLowerCase();
        notice_period_days = unit.startsWith('month') ? val * 30 : unit.startsWith('week') ? val * 7 : val;
        break;
      }
    }
  }

  return { candidate_name, education, experience_years, location, industry, notice_period_days };
}

export function parseJDText(text: string): Partial<{
  title: string;
  required_education: string;
  required_experience_years: number;
  required_location: string;
  industry: string;
  notice_period_days: number;
}> {
  const textLower = text.toLowerCase();
  
  const result: ReturnType<typeof parseJDText> = {};

  for (const pattern of EXPERIENCE_PATTERNS) {
    const match = text.match(pattern);
    if (match) { result.required_experience_years = parseFloat(match[1]); break; }
  }

  for (const pattern of EDUCATION_PATTERNS) {
    const match = text.match(pattern);
    if (match) { result.required_education = match[0].toUpperCase().replace(/\./g, ''); break; }
  }

  const loc = extractLocation(text);
  if (loc) result.required_location = loc;

  for (const ind of INDUSTRIES) {
    if (textLower.includes(ind)) {
      result.industry = ind.split(' ').map((w) => w[0].toUpperCase() + w.slice(1)).join(' ');
      break;
    }
  }

  if (text.match(/immediately\s*available|immediate\s*joining/i)) {
    result.notice_period_days = 0;
  } else {
    for (const pattern of NOTICE_PATTERNS) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const val = parseInt(match[1], 10);
        const unit = (match[2] || '').toLowerCase();
        result.notice_period_days = unit.startsWith('month') ? val * 30 : unit.startsWith('week') ? val * 7 : val;
        break;
      }
    }
  }

  return result;
}

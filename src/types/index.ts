export interface JobDescription {
  id: string;
  title: string;
  required_education: string | null;
  required_experience_years: number | null;
  required_location: string | null;
  industry: string | null;
  notice_period_days: number | null;
  raw_text: string | null;
  source: 'manual' | 'upload';
  created_at: string;
  updated_at: string;
}

export interface Resume {
  id: string;
  jd_id: string;
  candidate_name: string | null;
  education: string | null;
  experience_years: number | null;
  location: string | null;
  industry: string | null;
  notice_period_days: number | null;
  raw_text: string | null;
  filename: string | null;
  created_at: string;
}

export interface RankingConfig {
  id: string;
  jd_id: string;
  experience_priority: number;
  education_priority: number;
  location_priority: number;
  industry_priority: number;
  notice_period_priority: number;
  created_at: string;
}

export interface RankingResult {
  id: string;
  config_id: string;
  resume_id: string;
  jd_id: string;
  experience_score: number;
  education_score: number;
  location_score: number;
  industry_score: number;
  notice_period_score: number;
  total_score: number;
  rank: number;
  created_at: string;
  resume?: Resume;
}

export type ParameterKey =
  | 'experience'
  | 'education'
  | 'location'
  | 'industry'
  | 'notice_period';

export interface PriorityItem {
  key: ParameterKey;
  label: string;
  priority: number;
}

export type AppStep = 'jd' | 'resumes' | 'config' | 'results';

export interface ParsedResumeFields {
  candidate_name: string;
  education: string;
  experience_years: number | null;
  location: string;
  industry: string;
  notice_period_days: number | null;
}

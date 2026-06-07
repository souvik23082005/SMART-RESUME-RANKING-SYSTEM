import { JobDescription, Resume, RankingConfig, ParameterKey } from '../types';
import { getEducationLevel } from './fileParser';

export const PRIORITY_WEIGHTS: Record<number, number> = {
  1: 30, 2: 25, 3: 20, 4: 15, 5: 10,
};

export function getWeightForPriority(priority: number): number {
  return PRIORITY_WEIGHTS[priority] ?? 10;
}

function scoreExperience(jd: JobDescription, resume: Resume): number {
  const required = jd.required_experience_years ?? 0;
  const actual = resume.experience_years ?? 0;
  if (required === 0) return 85;
  const ratio = actual / required;
  if (ratio >= 1.0) return 100;
  if (ratio >= 0.8) return 85;
  if (ratio >= 0.6) return 65;
  if (ratio >= 0.4) return 45;
  if (ratio >= 0.2) return 25;
  return 10;
}

function scoreEducation(jd: JobDescription, resume: Resume): number {
  const requiredLevel = getEducationLevel(jd.required_education ?? '');
  const actualLevel = getEducationLevel(resume.education ?? '');
  if (requiredLevel === -1) return 70;
  if (actualLevel === -1) return 20;
  const diff = actualLevel - requiredLevel;
  if (diff >= 0) return 100;
  if (diff === -1) return 65;
  if (diff === -2) return 35;
  return 10;
}

function scoreLocation(jd: JobDescription, resume: Resume): number {
  const required = (jd.required_location ?? '').toLowerCase().trim();
  const actual = (resume.location ?? '').toLowerCase().trim();
  const resumeText = (resume.raw_text ?? '').toLowerCase();
  if (!required) return 80;
  if (!actual) {
    if (resumeText.includes('remote') || resumeText.includes('relocat')) return 60;
    return 30;
  }
  if (actual === required) return 100;
  if (actual.includes(required) || required.includes(actual)) return 90;
  if (resumeText.includes('willing to relocate') || resumeText.includes('open to relocation')) return 70;
  if (resumeText.includes('remote')) return 55;
  return 20;
}

function scoreIndustry(jd: JobDescription, resume: Resume): number {
  const required = (jd.industry ?? '').toLowerCase().trim();
  const actual = (resume.industry ?? '').toLowerCase().trim();
  if (!required) return 75;
  if (!actual) return 30;
  if (actual === required) return 100;
  if (actual.includes(required) || required.includes(actual)) return 90;
  const itRelated = ['information technology', 'it', 'software', 'ecommerce', 'telecom'];
  const financeRelated = ['banking', 'finance', 'insurance'];
  const healthRelated = ['healthcare', 'pharma', 'pharmaceutical'];
  for (const group of [itRelated, financeRelated, healthRelated]) {
    if (group.some((g) => required.includes(g)) && group.some((g) => actual.includes(g))) return 70;
  }
  return 10;
}

function scoreNoticePeriod(jd: JobDescription, resume: Resume): number {
  const requiredDays = jd.notice_period_days;
  const actualDays = resume.notice_period_days;
  if (requiredDays === null || requiredDays === undefined) return 80;
  if (actualDays === null || actualDays === undefined) return 40;
  if (actualDays === 0 && requiredDays === 0) return 100;
  if (requiredDays === 0) {
    if (actualDays <= 15) return 90;
    if (actualDays <= 30) return 65;
    if (actualDays <= 60) return 40;
    return 15;
  }
  const ratio = actualDays / requiredDays;
  if (ratio <= 1.0) return 100;
  if (ratio <= 1.25) return 80;
  if (ratio <= 1.5) return 60;
  if (ratio <= 2.0) return 35;
  return 10;
}

export interface CandidateScore {
  resume_id: string;
  experience_score: number;
  education_score: number;
  location_score: number;
  industry_score: number;
  notice_period_score: number;
  total_score: number;
  rank: number;
}

export function runRankingEngine(
  jd: JobDescription,
  resumes: Resume[],
  config: RankingConfig
): CandidateScore[] {
  const paramWeights: Record<ParameterKey, number> = {
    experience: getWeightForPriority(config.experience_priority),
    education: getWeightForPriority(config.education_priority),
    location: getWeightForPriority(config.location_priority),
    industry: getWeightForPriority(config.industry_priority),
    notice_period: getWeightForPriority(config.notice_period_priority),
  };

  const scores = resumes.map((resume) => {
    const exp = scoreExperience(jd, resume);
    const edu = scoreEducation(jd, resume);
    const loc = scoreLocation(jd, resume);
    const ind = scoreIndustry(jd, resume);
    const np = scoreNoticePeriod(jd, resume);

    const total =
      (exp * paramWeights.experience +
        edu * paramWeights.education +
        loc * paramWeights.location +
        ind * paramWeights.industry +
        np * paramWeights.notice_period) / 100;

    return {
      resume_id: resume.id,
      experience_score: Math.round(exp),
      education_score: Math.round(edu),
      location_score: Math.round(loc),
      industry_score: Math.round(ind),
      notice_period_score: Math.round(np),
      total_score: Math.round(total * 10) / 10,
      rank: 0,
    };
  });

  scores.sort((a, b) => b.total_score - a.total_score);
  return scores.map((s, i) => ({ ...s, rank: i + 1 }));
}

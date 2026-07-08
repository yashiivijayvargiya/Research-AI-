/* ============================================================
   ReachAI — Resume / Job Description Analysis Engine
   ============================================================
   Real (not hardcoded) analysis:
   1. Extracts text from an uploaded resume file (pdf/docx/txt)
      or accepts pasted text.
   2. Detects skills mentioned in the job description AND in the
      resume using a skill dictionary with common aliases.
   3. Extracts required/held years of experience and education
      level via regex.
   4. Produces a compatibility score + skill tags + pass/warn/fail
      criteria that genuinely reflect the two input texts.
   ============================================================ */

const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');

// ─── Skill dictionary: canonical name -> alias patterns ──────
const SKILL_LIBRARY = [
  ['React', ['react\\.js', 'reactjs', '\\breact\\b']],
  ['TypeScript', ['typescript', '\\bts\\b']],
  ['JavaScript', ['javascript', '\\bjs\\b']],
  ['Node.js', ['node\\.js', 'nodejs', '\\bnode\\b']],
  ['Python', ['python']],
  ['Go', ['golang', '\\bgo\\b']],
  ['Rust', ['\\brust\\b']],
  ['Java', ['\\bjava\\b(?!script)']],
  ['C++', ['c\\+\\+', '\\bcpp\\b']],
  ['C#', ['c#', '\\bc sharp\\b']],
  ['System Design', ['system design', 'distributed systems', 'software architecture']],
  ['GraphQL', ['graphql']],
  ['REST APIs', ['rest api', 'restful']],
  ['AWS', ['\\baws\\b', 'amazon web services']],
  ['GCP', ['\\bgcp\\b', 'google cloud']],
  ['Azure', ['\\bazure\\b']],
  ['Kubernetes', ['kubernetes', '\\bk8s\\b']],
  ['Docker', ['docker', 'container']],
  ['Terraform', ['terraform', 'infrastructure as code', '\\biac\\b']],
  ['CI/CD', ['ci/cd', 'continuous integration', 'continuous deployment', 'jenkins', 'github actions']],
  ['PostgreSQL', ['postgresql', 'postgres']],
  ['MySQL', ['mysql']],
  ['MongoDB', ['mongodb', '\\bmongo\\b']],
  ['Redis', ['redis']],
  ['SQL', ['\\bsql\\b']],
  ['Machine Learning', ['machine learning', '\\bml\\b(?!\\w)']],
  ['Leadership', ['leadership', 'led a team', 'managed a team', 'mentoring', 'mentored']],
  ['Project Management', ['project management', '\\bagile\\b', '\\bscrum\\b']],
  ['HTML/CSS', ['\\bhtml\\b', '\\bcss\\b']],
  ['Vue', ['vue\\.js', 'vuejs', '\\bvue\\b']],
  ['Angular', ['angular']],
  ['Swift', ['\\bswift\\b']],
  ['Kotlin', ['kotlin']],
  ['Data Analysis', ['data analysis', 'data analytics']],
  ['Excel', ['\\bexcel\\b']],
  ['Sales', ['\\bsales\\b']],
  ['Marketing', ['marketing']],
  ['Figma', ['figma']],
  ['UI/UX Design', ['ui/ux', 'user experience', 'user interface design']],
  ['Communication', ['communication skills', 'strong communicat']],
];

function extractSkills(text) {
  const found = new Set();
  const lower = (text || '').toLowerCase();
  for (const [name, patterns] of SKILL_LIBRARY) {
    for (const p of patterns) {
      if (new RegExp(p, 'i').test(lower)) {
        found.add(name);
        break;
      }
    }
  }
  return found;
}

function extractMaxYears(text) {
  const matches = [...(text || '').matchAll(/(\d{1,2})\+?\s*(?:years?|yrs?)/gi)];
  if (!matches.length) return null;
  return Math.max(...matches.map(m => parseInt(m[1], 10)));
}

const EDUCATION_LEVELS = [
  ['PhD', ['ph\\.?d', 'doctorate']],
  ["Master's", ['master', '\\bm\\.?s\\.?\\b', 'mba']],
  ["Bachelor's", ['bachelor', '\\bb\\.?s\\.?\\b', '\\bb\\.?a\\.?\\b']],
  ['High School', ['high school']],
];

function highestEducation(text) {
  const lower = (text || '').toLowerCase();
  for (const [label, patterns] of EDUCATION_LEVELS) {
    if (patterns.some(p => new RegExp(p, 'i').test(lower))) return label;
  }
  return null;
}

// ─── File text extraction ─────────────────────────────────────

async function extractTextFromFile(file) {
  // file: multer memory-storage file object { buffer, originalname, mimetype }
  const name = (file.originalname || '').toLowerCase();
  const buf = file.buffer;

  if (name.endsWith('.pdf') || file.mimetype === 'application/pdf') {
    const data = await pdfParse(buf);
    return data.text;
  }
  if (name.endsWith('.docx') || file.mimetype.includes('officedocument.wordprocessingml')) {
    const result = await mammoth.extractRawText({ buffer: buf });
    return result.value;
  }
  // .txt, .doc (legacy), or anything else: best-effort as plain text
  return buf.toString('utf-8');
}

// ─── Core analysis ────────────────────────────────────────────

function analyze(jobText, resumeText) {
  const requiredSkills = [...extractSkills(jobText)];
  const resumeSkillSet = extractSkills(resumeText);

  const matched = requiredSkills.filter(s => resumeSkillSet.has(s));
  const missing = requiredSkills.filter(s => !resumeSkillSet.has(s));
  const extraResumeSkills = [...resumeSkillSet].filter(s => !requiredSkills.includes(s));

  const skillTags = [
    ...matched.map(name => ({ name, status: 'matched' })),
    ...missing.map(name => ({ name, status: 'missing' })),
    ...extraResumeSkills.map(name => ({ name, status: 'adjacent' })),
  ];

  const requiredYears = extractMaxYears(jobText);
  const candidateYears = extractMaxYears(resumeText);
  const candidateEducation = highestEducation(resumeText);
  const jobEducation = highestEducation(jobText);

  // ── Score ──
  let skillRatio = requiredSkills.length ? matched.length / requiredSkills.length : (resumeSkillSet.size ? 0.6 : 0.3);
  let score = Math.round(skillRatio * 70); // skills = up to 70 points

  // Experience contributes up to 20 points
  if (requiredYears == null) {
    score += 15; // no explicit requirement found — don't penalize
  } else if (candidateYears == null) {
    score += 5;
  } else if (candidateYears >= requiredYears) {
    score += 20;
  } else {
    score += Math.round((candidateYears / requiredYears) * 20);
  }

  // Education contributes up to 10 points
  const eduRank = { 'High School': 1, "Bachelor's": 2, "Master's": 3, 'PhD': 4 };
  if (!jobEducation) {
    score += 8;
  } else if (candidateEducation && eduRank[candidateEducation] >= eduRank[jobEducation]) {
    score += 10;
  } else if (candidateEducation) {
    score += 4;
  }

  score = Math.max(1, Math.min(100, score));

  // ── Criteria list ──
  const criteria = [];

  if (requiredSkills.length === 0) {
    criteria.push({
      status: 'warn',
      title: 'Technical Proficiency',
      desc: 'Could not detect specific required skills in the job description — try pasting the full requirements section for a more precise match.',
    });
  } else {
    const pct = matched.length / requiredSkills.length;
    criteria.push({
      status: pct >= 0.6 ? 'pass' : pct >= 0.3 ? 'warn' : 'fail',
      title: 'Technical Proficiency',
      desc: `Matches ${matched.length} of ${requiredSkills.length} required skills detected in the job description${matched.length ? ` (${matched.slice(0, 6).join(', ')})` : ''}.`,
    });
  }

  if (requiredYears == null) {
    criteria.push({
      status: 'warn',
      title: 'Years of Experience',
      desc: 'No explicit experience requirement was detected in the job description.',
    });
  } else {
    criteria.push({
      status: candidateYears != null && candidateYears >= requiredYears ? 'pass' : candidateYears != null ? 'warn' : 'fail',
      title: 'Years of Experience',
      desc: candidateYears != null
        ? `Role requires ${requiredYears}+ years; resume indicates ${candidateYears}+ years of experience.`
        : `Role requires ${requiredYears}+ years; could not detect years of experience in the resume text.`,
    });
  }

  criteria.push({
    status: !jobEducation ? 'warn' : (candidateEducation && eduRank[candidateEducation] >= eduRank[jobEducation]) ? 'pass' : 'warn',
    title: 'Education',
    desc: jobEducation
      ? `Role suggests ${jobEducation} level education; resume indicates ${candidateEducation || 'no clearly stated degree'}.`
      : `No explicit education requirement detected. Resume indicates ${candidateEducation || 'no clearly stated degree'}.`,
  });

  criteria.push({
    status: missing.length === 0 ? 'pass' : missing.length <= 2 ? 'warn' : 'fail',
    title: 'Skill Gaps',
    desc: missing.length
      ? `Missing or undetected: ${missing.join(', ')}.`
      : 'No gaps detected across the skills identified in the job description.',
  });

  const summary = requiredSkills.length
    ? `${matched.length} of ${requiredSkills.length} required skills present.${missing.length ? ` Consider strengthening: ${missing.slice(0, 3).join(', ')}.` : ' Strong alignment across all detected requirements.'}`
    : 'Add more detail to the job description for a more precise skill breakdown.';

  return {
    score,
    summary,
    skillTags,
    criteria,
    requiredSkills,
    matchedSkills: matched,
    missingSkills: missing,
  };
}

module.exports = { analyze, extractTextFromFile, extractSkills };

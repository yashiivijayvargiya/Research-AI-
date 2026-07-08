/* ============================================================
   ReachAI — Application Logic
   State Management, Mock Data Engine & Full Interactivity
   ============================================================ */

// ─── State ───────────────────────────────────────────────────
const state = {
  currentPersona: 'seeker',       // seeker | employee | university
  currentModule: 'analyzer',      // analyzer | discovery | referral | communication | pipeline | analytics
  theme: 'dark',
  analysisRun: false,
  toneValue: 30,
  user: null,                     // Real account data from /api/me (id, name, email, onboarding)
  linkedInUser: null,             // LinkedIn profile data when logged in via OAuth
  personaLocked: false,           // true after onboarding — prevents persona switching
  lockedPersona: null,            // which persona this account is locked to ('seeker' | 'employee')
  onboardingData: null,           // Data collected during onboarding wizard
  acceptsReferrals: true,         // Employee: whether they accept referral requests
};

// ─── Persona → Module Mapping ────────────────────────────────
const personaModules = {
  seeker: ['analyzer', 'discovery', 'communication', 'pipeline', 'analytics'],
  employee: ['referral', 'discovery', 'communication', 'pipeline', 'analytics'],
  university: ['analyzer', 'discovery', 'communication', 'pipeline', 'analytics'],
};

const personaLabels = {
  seeker: 'Job Seeker',
  employee: 'Company Employee',
  university: 'Placement Officer',
};

const moduleTitles = {
  analyzer: 'Job Analyzer & Resume Matcher',
  discovery: 'AI-Driven Contact Discovery',
  referral: 'Explainable AI Referral Evaluator',
  communication: 'Hyper-Personalized Communication Suite',
  pipeline: 'Outreach Lifecycle Tracker',
  analytics: 'Analytics & Hiring Funnel',
};

// ─── Mock Data ───────────────────────────────────────────────

// Module 1: Skills
const skillData = [
  { name: 'React', status: 'matched' },
  { name: 'TypeScript', status: 'matched' },
  { name: 'Node.js', status: 'matched' },
  { name: 'System Design', status: 'matched' },
  { name: 'GraphQL', status: 'matched' },
  { name: 'AWS', status: 'matched' },
  { name: 'Kubernetes', status: 'missing' },
  { name: 'Go', status: 'missing' },
  { name: 'Terraform', status: 'missing' },
  { name: 'Docker', status: 'adjacent' },
  { name: 'Python', status: 'adjacent' },
  { name: 'CI/CD', status: 'adjacent' },
  { name: 'PostgreSQL', status: 'matched' },
  { name: 'Redis', status: 'adjacent' },
  { name: 'Rust', status: 'missing' },
];

const criteriaData = [
  { status: 'pass', title: 'Technical Proficiency', desc: 'Strong match across 6/9 required technical skills. Demonstrated React, TypeScript, and Node.js expertise.' },
  { status: 'pass', title: 'Years of Experience', desc: 'Exceeds the minimum 4-year requirement with 6+ years of relevant full-stack development experience.' },
  { status: 'pass', title: 'Education & Certifications', desc: 'BS in Computer Science from a recognized institution. AWS Solutions Architect certification is a plus.' },
  { status: 'warn', title: 'Domain Knowledge', desc: 'Limited direct experience in fintech sector. Adjacent experience in e-commerce could partially transfer.' },
  { status: 'warn', title: 'Infrastructure & DevOps', desc: 'Docker experience present but lacking Kubernetes and Terraform which are listed as required.' },
  { status: 'pass', title: 'Communication & Leadership', desc: 'Evidence of leading cross-functional teams and mentoring junior developers.' },
  { status: 'fail', title: 'Systems Programming', desc: 'No Go or Rust experience detected. Role requires backend microservices development in Go.' },
];

// Module 2: Contacts
const contactsData = {
  'Google': [
    { name: 'Sarah Chen', role: 'Talent Acquisition Lead', email: 's.chen@google.com', source: 'LinkedIn Verified', confidence: 96 },
    { name: 'Marcus Rodriguez', role: 'University Relations Manager', email: 'm.rodriguez@google.com', source: 'Company Directory', confidence: 92 },
    { name: 'Priya Sharma', role: 'Engineering Recruiter', email: 'p.sharma@google.com', source: 'Email Pattern Match', confidence: 88 },
    { name: 'David Kim', role: 'Technical Sourcer', email: 'd.kim@google.com', source: 'LinkedIn Verified', confidence: 94 },
    { name: 'Emily Watson', role: 'Hiring Manager — SWE', email: 'e.watson@google.com', source: 'Referral Network', confidence: 79 },
  ],
  'Meta': [
    { name: 'Jason Liu', role: 'Senior Technical Recruiter', email: 'j.liu@meta.com', source: 'LinkedIn Verified', confidence: 93 },
    { name: 'Amanda Torres', role: 'University Programs Lead', email: 'a.torres@meta.com', source: 'Company Directory', confidence: 90 },
    { name: 'Chris Nakamura', role: 'Engineering Hiring Lead', email: 'c.nakamura@meta.com', source: 'Email Pattern Match', confidence: 85 },
    { name: 'Rachel Green', role: 'Diversity Recruiting', email: 'r.green@meta.com', source: 'LinkedIn Verified', confidence: 91 },
  ],
  'Stripe': [
    { name: 'Alex Morrison', role: 'Head of Talent', email: 'a.morrison@stripe.com', source: 'Company Directory', confidence: 97 },
    { name: 'Nina Patel', role: 'Engineering Recruiter', email: 'n.patel@stripe.com', source: 'LinkedIn Verified', confidence: 89 },
    { name: 'Tom O\'Brien', role: 'University Relations', email: 't.obrien@stripe.com', source: 'Referral Network', confidence: 82 },
  ],
  'default': [
    { name: 'Taylor Davis', role: 'Talent Acquisition', email: 'recruiting@company.com', source: 'Email Pattern Match', confidence: 72 },
    { name: 'Jordan Smith', role: 'HR Business Partner', email: 'hr.partner@company.com', source: 'LinkedIn Verified', confidence: 68 },
    { name: 'Casey Williams', role: 'Technical Recruiter', email: 'tech.recruit@company.com', source: 'Company Directory', confidence: 75 },
  ]
};

// Module 3: Referral Requests
const referralData = [
  {
    id: 1,
    name: 'Ananya Gupta',
    initials: 'AG',
    targetRole: 'Senior Frontend Engineer',
    matchRate: 91,
    recommendation: 'recommended',
    badgeText: 'Recommended',
    strengths: [
      'Extensive React/TypeScript experience (5+ years) aligns perfectly with team stack',
      'Contributed to 3 open-source design systems with significant GitHub traction',
      'Prior experience at high-scale consumer products (50M+ MAU)',
      'Strong referral from team lead who has worked with candidate previously',
    ],
    improvements: [
      'Limited backend experience — may need onboarding for full-stack rotations',
      'No direct experience with the company\'s proprietary framework',
    ],
    reasoning: 'The candidate demonstrates exceptional frontend expertise that directly maps to the team\'s immediate needs. The strong prior working relationship with the referrer adds confidence. Recommend fast-tracking to technical screen.',
  },
  {
    id: 2,
    name: 'Marcus Johnson',
    initials: 'MJ',
    targetRole: 'Backend Engineer (Go)',
    matchRate: 67,
    recommendation: 'consider',
    badgeText: 'Consider',
    strengths: [
      'Solid distributed systems background with microservices architecture',
      'Published research on API performance optimization',
      'Strong problem-solving skills demonstrated through competitive programming',
    ],
    improvements: [
      'Primary experience is in Java/Python — Go proficiency is self-reported but unverified',
      'Resume shows frequent job changes (3 roles in 2 years)',
      'No direct experience with the fintech compliance requirements of this role',
    ],
    reasoning: 'Candidate has transferable backend skills but the Go language gap and role-hopping pattern warrant deeper evaluation. Recommend a targeted Go coding assessment before advancing.',
  },
  {
    id: 3,
    name: 'Elena Volkov',
    initials: 'EV',
    targetRole: 'Staff ML Engineer',
    matchRate: 42,
    recommendation: 'not-recommended',
    badgeText: 'Not Recommended',
    strengths: [
      'PhD in Computer Vision with 3 published papers',
      'Familiar with PyTorch and basic model training workflows',
    ],
    improvements: [
      'Role requires ML Systems/MLOps experience — candidate is research-focused',
      'No production ML deployment experience detected',
      'Skill overlap is primarily academic; role demands 7+ years industry experience',
      'Significant seniority gap — candidate has 2 years post-PhD experience vs. Staff-level requirement',
    ],
    reasoning: 'While the candidate has strong academic credentials, there is a fundamental mismatch between the research-oriented background and the Staff ML Engineer requirements which emphasize production systems at scale. Not recommended for this specific role.',
  },
  {
    id: 4,
    name: 'David Park',
    initials: 'DP',
    targetRole: 'Product Designer',
    matchRate: 84,
    recommendation: 'recommended',
    badgeText: 'Recommended',
    strengths: [
      'Award-winning portfolio with enterprise SaaS products',
      'Proficient in Figma, design systems, and accessibility standards (WCAG 2.1)',
      'Previous experience redesigning onboarding flows that improved conversion by 34%',
      'Strong user research methodology and data-driven design approach',
    ],
    improvements: [
      'Limited mobile-native design experience',
      'Portfolio skews toward B2B — consumer experience is minimal',
    ],
    reasoning: 'Strong product design candidate with demonstrable impact metrics. Enterprise SaaS background is highly relevant. Mobile gap is minor given team structure. Recommend advancing to portfolio review.',
  },
  {
    id: 5,
    name: 'Fatima Al-Hassan',
    initials: 'FA',
    targetRole: 'DevOps Engineer',
    matchRate: 73,
    recommendation: 'consider',
    badgeText: 'Consider',
    strengths: [
      'AWS Certified Solutions Architect with 4 years of cloud infrastructure experience',
      'Hands-on Kubernetes administration across multi-cluster environments',
      'Implemented CI/CD pipelines reducing deployment time by 60%',
    ],
    improvements: [
      'No experience with the company\'s primary cloud provider (GCP)',
      'Terraform experience is intermediate — role expects expert-level IaC skills',
      'Missing security compliance certifications mentioned in job requirements',
    ],
    reasoning: 'Solid DevOps fundamentals with strong AWS background. The GCP migration would require ramp-up time. Consider if team capacity exists for cloud platform cross-training.',
  },
];

// Module 4: Communication Templates
const messageTemplates = {
  linkedin: {
    formal: `Dear <span class="placeholder">[Recipient_Name]</span>,

I hope this message finds you well. I am reaching out regarding the <span class="placeholder">[Role_Title]</span> position at <span class="placeholder">[Company_Name]</span>. With over six years of full-stack development experience and a strong background in distributed systems, I believe my expertise aligns closely with your team's needs.

I have been following <span class="placeholder">[Company_Name]</span>'s recent work in AI-powered developer tooling and would welcome the opportunity to discuss how my experience could contribute to your engineering initiatives.

I would appreciate the chance to connect at your convenience.

Best regards`,
    casual: `Hey <span class="placeholder">[Recipient_Name]</span>! 👋

Came across the <span class="placeholder">[Role_Title]</span> opening at <span class="placeholder">[Company_Name]</span> and got genuinely excited — the work your team's doing with developer tooling is awesome.

I've been building full-stack products for 6+ years and I think there could be a great fit here. Would love to chat if you're open to it!

Cheers`,
  },
  referral: {
    formal: `Dear <span class="placeholder">[Recipient_Name]</span>,

I am writing to respectfully request a referral for the <span class="placeholder">[Role_Title]</span> role at <span class="placeholder">[Company_Name]</span>. Having reviewed the position requirements thoroughly, I am confident that my technical background in React, TypeScript, and system design closely mirrors the qualifications sought.

Attached is my resume for your review. I would be grateful for any guidance or support you could provide in this process, and I am happy to share any additional materials that would be helpful.

Thank you sincerely for your time and consideration.

Warm regards`,
    casual: `Hi <span class="placeholder">[Recipient_Name]</span>!

I noticed <span class="placeholder">[Company_Name]</span> has an opening for <span class="placeholder">[Role_Title]</span> — and honestly, it looks like a perfect match for what I've been working on. Would you be open to putting in a referral for me?

Happy to send over my resume and chat about why I think I'd be a great fit. No pressure at all, just thought I'd ask since you're doing amazing work there! 🙏

Thanks so much!`,
  },
  cold: {
    formal: `Dear <span class="placeholder">[Recipient_Name]</span>,

I am reaching out to express my interest in the <span class="placeholder">[Role_Title]</span> position at <span class="placeholder">[Company_Name]</span>. My background encompasses six years of production-level experience across the full stack, with particular depth in React ecosystems and cloud-native architectures.

Key highlights from my experience include:
• Architected a real-time analytics platform processing 2M+ events daily
• Led a team of 5 engineers delivering a 40% improvement in page load performance
• AWS Solutions Architect certified with extensive CI/CD pipeline experience

I would welcome the opportunity to discuss how my skills could benefit your team. May I schedule a brief call at your convenience?

Respectfully`,
    casual: `Hey <span class="placeholder">[Recipient_Name]</span>,

I'm a full-stack engineer really interested in what <span class="placeholder">[Company_Name]</span> is building, and the <span class="placeholder">[Role_Title]</span> role caught my eye.

Quick highlights about me:
• 6+ years shipping production apps (React, Node, AWS)
• Built a real-time analytics platform handling 2M+ daily events
• Love working in fast-paced, product-driven teams

Would you be up for a quick chat? I'd love to learn more about the team and share what I could bring to the table.

Thanks!`,
  },
  campus: {
    formal: `Dear <span class="placeholder">[Recipient_Name]</span>,

On behalf of <span class="placeholder">[University_Name]</span>'s Career Services department, I am writing to extend an invitation for <span class="placeholder">[Company_Name]</span> to participate in our upcoming campus recruitment events.

Our institution produces top-tier graduates in Computer Science, Data Science, and Engineering, many of whom have expressed strong interest in opportunities at <span class="placeholder">[Company_Name]</span>.

We would be pleased to arrange a dedicated recruitment session, tech talk, or information booth at our annual career fair. I would welcome the chance to discuss partnership opportunities.

Sincerely`,
    casual: `Hi <span class="placeholder">[Recipient_Name]</span>!

I'm reaching out from <span class="placeholder">[University_Name]</span>'s placement office — we'd love to have <span class="placeholder">[Company_Name]</span> at our next campus event!

Our CS and engineering students are consistently asking about opportunities at your company, and we think a tech talk or recruitment booth would be a huge hit.

Let me know if you'd be interested and we can work out the details. Would be great to have you!

Best`,
  },
  followup: {
    formal: `Dear <span class="placeholder">[Recipient_Name]</span>,

I am writing to follow up on my previous correspondence regarding the <span class="placeholder">[Role_Title]</span> position at <span class="placeholder">[Company_Name]</span>. I remain highly enthusiastic about the opportunity and wanted to reiterate my interest.

Should you require any additional information or materials to support the evaluation process, please do not hesitate to let me know.

Thank you for your time and consideration.

Best regards`,
    casual: `Hey <span class="placeholder">[Recipient_Name]</span>,

Just wanted to bump my earlier message about the <span class="placeholder">[Role_Title]</span> role at <span class="placeholder">[Company_Name]</span>. Still super excited about it! 😊

Totally understand you're busy — just didn't want my message to get buried. Happy to chat whenever works for you.

Thanks again!`,
  }
};

// Module 5: Kanban Data
const kanbanData = {
  discovered: [
    { name: 'Sarah Chen — Google', role: 'TA Lead', priority: 'high', date: 'Jun 28' },
    { name: 'Alex Morrison — Stripe', role: 'Head of Talent', priority: 'high', date: 'Jun 30' },
    { name: 'Nina Patel — Stripe', role: 'Eng Recruiter', priority: 'medium', date: 'Jul 1' },
  ],
  sent: [
    { name: 'Jason Liu — Meta', role: 'Sr. Tech Recruiter', priority: 'high', date: 'Jun 25' },
    { name: 'David Kim — Google', role: 'Technical Sourcer', priority: 'medium', date: 'Jun 26' },
  ],
  approved: [
    { name: 'Priya Sharma — Google', role: 'Eng Recruiter', priority: 'high', date: 'Jun 20' },
    { name: 'Amanda Torres — Meta', role: 'University Programs', priority: 'medium', date: 'Jun 22' },
  ],
  interview: [
    { name: 'Chris Nakamura — Meta', role: 'Eng Hiring Lead', priority: 'high', date: 'Jun 15' },
  ],
  offer: [
    { name: 'Rachel Green — Meta', role: 'Diversity Recruiting', priority: 'low', date: 'Jun 10' },
  ],
};

const kanbanColumns = [
  { key: 'discovered', label: 'Contact Discovered', color: 'var(--stage-discovered)' },
  { key: 'sent', label: 'Outreach Sent', color: 'var(--stage-sent)' },
  { key: 'approved', label: 'Referral Approved', color: 'var(--stage-approved)' },
  { key: 'interview', label: 'Interview Scheduled', color: 'var(--stage-interview)' },
  { key: 'offer', label: 'Offer Received', color: 'var(--stage-offer)' },
];

// Module 6: Analytics Data
const analyticsStats = [
  { label: 'Total Outreach', value: '147', change: '+23', positive: true, icon: 'send', color: 'var(--accent-primary)' },
  { label: 'Response Rate', value: '34.2%', change: '+5.1%', positive: true, icon: 'reply', color: 'var(--color-info)' },
  { label: 'Referral Success', value: '18.7%', change: '+2.3%', positive: true, icon: 'check', color: 'var(--color-success)' },
  { label: 'Avg. Response Time', value: '2.4d', change: '-0.8d', positive: true, icon: 'clock', color: 'var(--color-warning)' },
];

const funnelData = [
  { label: 'Contacts Discovered', value: 147, color: 'var(--stage-discovered)' },
  { label: 'Outreach Sent', value: 98, color: 'var(--stage-sent)' },
  { label: 'Responses Received', value: 51, color: 'var(--stage-approved)' },
  { label: 'Interviews Scheduled', value: 22, color: 'var(--stage-interview)' },
  { label: 'Offers Received', value: 7, color: 'var(--stage-offer)' },
];

// ─── SVG Icon Helpers ────────────────────────────────────────
const icons = {
  send: '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>',
  reply: '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 17 4 12 9 7"/><path d="M20 18v-2a4 4 0 0 0-4-4H4"/></svg>',
  check: '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>',
  clock: '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
  chevronDown: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>',
  sparkles: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3-1.9 5.8a2 2 0 0 1-1.287 1.288L3 12l5.8 1.9a2 2 0 0 1 1.288 1.287L12 21l1.9-5.8a2 2 0 0 1 1.287-1.288L21 12l-5.8-1.9a2 2 0 0 1-1.288-1.287Z"/></svg>',
  checkCircle: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m9 11 3 3L22 4"/></svg>',
  matched: '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>',
  missing: '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>',
  adjacent: '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 12h8"/></svg>',
};

// ─── DOM References ──────────────────────────────────────────
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

// ─── Theme Toggle ────────────────────────────────────────────
function initTheme() {
  const saved = localStorage.getItem('reachai-theme');
  if (saved) {
    state.theme = saved;
    document.documentElement.setAttribute('data-theme', saved);
  }
  updateThemeUI();
}

function toggleTheme() {
  state.theme = state.theme === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', state.theme);
  localStorage.setItem('reachai-theme', state.theme);
  updateThemeUI();
}

function updateThemeUI() {
  const isDark = state.theme === 'dark';
  $('#theme-icon-dark').style.display = isDark ? 'block' : 'none';
  $('#theme-icon-light').style.display = isDark ? 'none' : 'block';
  $('#theme-label').textContent = isDark ? 'Dark Mode' : 'Light Mode';
}

// ─── Persona Switching ───────────────────────────────────────
function switchPersona(persona) {
  // If persona is locked (user completed onboarding), only ever allow the
  // account's own locked persona through — comparing against currentPersona
  // (as before) silently dropped the very first switch after locking, since
  // personaLocked is set to true right before this first call.
  if (state.personaLocked && persona !== state.lockedPersona) {
    return;
  }

  state.currentPersona = persona;

  $$('.persona-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.persona === persona));
  $('#persona-badge').textContent = personaLabels[persona];

  // Show/hide nav items
  const allowed = personaModules[persona];
  $$('.nav-item').forEach(item => {
    const mod = item.dataset.module;
    item.style.display = allowed.includes(mod) ? 'flex' : 'none';
  });

  // If current module isn't in allowed list, switch to first allowed
  if (!allowed.includes(state.currentModule)) {
    switchModule(allowed[0]);
  }

  // If persona is locked, hide the persona switcher
  const switcher = $('.persona-switcher');
  if (switcher) {
    switcher.classList.toggle('locked', state.personaLocked);
  }
}

// ─── Module Switching ────────────────────────────────────────
function switchModule(module) {
  state.currentModule = module;

  $$('.nav-item').forEach(item => item.classList.toggle('active', item.dataset.module === module));
  $$('.module-panel').forEach(panel => panel.classList.toggle('active', panel.id === `module-${module}`));
  $('#page-title').textContent = moduleTitles[module];

  // Trigger auto-populate on first visit
  if (module === 'discovery' && !$('#contacts-tbody').children.length) {
    renderContacts('Google');
  }
  if (module === 'referral' && !$('#referral-queue').children.length) {
    renderReferralQueue();
  }
  if (module === 'communication') {
    generateMessage();
  }
  if (module === 'pipeline') {
    renderKanban();
  }
  if (module === 'analytics') {
    renderAnalytics();
  }
}

// ─── Module 1: Job Analyzer ─────────────────────────────────
async function runAnalysis() {
  const jobText = $('#job-text-input').value.trim();
  const resumeText = $('#linkedin-text-input').value.trim();
  const btn = $('#btn-analyze');

  if (!jobText) {
    showToast('Paste or type a job description first.');
    return;
  }
  if (!selectedResumeFile && !resumeText) {
    showToast('Upload a resume file or paste your resume/LinkedIn text first.');
    return;
  }

  const originalBtnHtml = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = 'Analyzing…';

  try {
    const formData = new FormData();
    formData.append('jobText', jobText);
    if (selectedResumeFile) {
      formData.append('resume', selectedResumeFile);
    } else {
      formData.append('resumeText', resumeText);
    }

    const resp = await fetch('/api/analyze', { method: 'POST', body: formData });
    const data = await resp.json();

    if (!resp.ok || !data.success) {
      showToast(data.message || 'Could not analyze that resume against the job description.');
      return;
    }

    state.analysisRun = true;

    // Show results
    $('#analysis-results').style.display = 'grid';
    $('#criteria-card').style.display = 'block';

    // Animate gauge with the REAL computed score
    const targetScore = data.score;
    const circumference = 2 * Math.PI * 85; // ~534
    const offset = circumference - (targetScore / 100) * circumference;

    const gaugeFill = $('#gauge-fill');
    gaugeFill.style.strokeDasharray = circumference;
    void gaugeFill.offsetWidth; // force reflow
    gaugeFill.style.strokeDashoffset = offset;

    animateNumber($('#gauge-score'), 0, targetScore, 1200);

    $('#gauge-summary').textContent = data.summary;

    renderSkillTags(data.skillTags);
    renderCriteria(data.criteria);

    $('#analysis-results').scrollIntoView({ behavior: 'smooth', block: 'start' });
  } catch (err) {
    console.error('Analysis request failed:', err);
    showToast('Network error while analyzing. Please try again.');
  } finally {
    btn.disabled = false;
    btn.innerHTML = originalBtnHtml;
  }
}

function animateNumber(el, from, to, duration) {
  const start = performance.now();
  function tick(now) {
    const elapsed = now - start;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
    el.textContent = Math.round(from + (to - from) * eased);
    if (progress < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

function renderSkillTags(tags) {
  const container = $('#skill-tags-container');
  const data = tags || skillData;
  container.innerHTML = data.map(skill => `
    <span class="skill-tag ${skill.status}">
      ${icons[skill.status]}
      ${skill.name}
    </span>
  `).join('');
}

function renderCriteria(list) {
  const listEl = $('#criteria-list');
  const data = list || criteriaData;
  listEl.innerHTML = data.map((c, i) => `
    <li class="criteria-item" data-index="${i}">
      <div class="criteria-icon ${c.status}">
        ${c.status === 'pass' ? '✓' : c.status === 'warn' ? '!' : '✗'}
      </div>
      <div class="criteria-detail">
        <h4>${c.title}</h4>
        <p>${c.desc}</p>
      </div>
    </li>
  `).join('');
}

// ─── Module 2: Contact Discovery ─────────────────────────────
function renderContacts(companyName) {
  const key = contactsData[companyName] ? companyName : 'default';
  const contacts = contactsData[key];
  const tbody = $('#contacts-tbody');

  tbody.innerHTML = contacts.map(c => {
    const barColor = c.confidence >= 90 ? 'var(--color-success)'
      : c.confidence >= 75 ? 'var(--color-warning)'
      : 'var(--color-danger)';

    return `
    <tr>
      <td>
        <div style="font-weight:600;">${c.name}</div>
        <div style="font-size:0.75rem;color:var(--text-tertiary);">${c.role}</div>
      </td>
      <td>
        <span class="email-badge">
          <span class="dot"></span>
          ${c.email}
        </span>
      </td>
      <td><span class="source-badge">${c.source}</span></td>
      <td>
        <div class="confidence-bar">
          <div class="bar-track">
            <div class="bar-fill" style="width:${c.confidence}%;background:${barColor}"></div>
          </div>
          <span class="bar-value" style="color:${barColor}">${c.confidence}%</span>
        </div>
      </td>
      <td>
        <button class="btn btn-primary btn-sm" onclick="initiateOutreach('${c.name}','${c.email}')">
          ${icons.send.replace(/width="22"/g,'width="14"').replace(/height="22"/g,'height="14"')}
          Initiate Outreach
        </button>
      </td>
    </tr>`;
  }).join('');
}

function initiateOutreach(name, email) {
  // Switch to Communication Suite and pre-fill
  switchModule('communication');
  $('#comm-recipient').value = name.split(' ')[0] + ' ' + name.split(' ').slice(1).join(' ');
  generateMessage();
  showToast(`Outreach initiated for ${name}`);
}

// ─── Module 3: Referral Evaluator ────────────────────────────
function renderReferralQueue() {
  const queue = $('#referral-queue');
  queue.innerHTML = referralData.map(r => `
    <div class="referral-item" id="referral-${r.id}">
      <div class="referral-item-header">
        <div class="referral-applicant">
          <div class="referral-avatar">${r.initials}</div>
          <div class="referral-applicant-info">
            <h4>${r.name}</h4>
            <p>Applying for: ${r.targetRole}</p>
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:var(--space-lg);">
          <div class="match-rate-bar">
            <span>Match:</span>
            <div class="bar-track">
              <div class="bar-fill" style="width:${r.matchRate}%"></div>
            </div>
            <span>${r.matchRate}%</span>
          </div>
          <span class="ai-badge ${r.recommendation}">
            ${icons.sparkles}
            ${r.badgeText}
          </span>
        </div>
      </div>
      <div class="expand-toggle" onclick="toggleXAI(${r.id})">
        <span>View XAI Justification</span>
        ${icons.chevronDown}
      </div>
      <div class="xai-block" id="xai-${r.id}">
        <p class="xai-section-title strengths">${icons.checkCircle} Strengths</p>
        <ul class="xai-list">
          ${r.strengths.map(s => `<li>${s}</li>`).join('')}
        </ul>
        <p class="xai-section-title improvements">⚠ Areas for Improvement</p>
        <ul class="xai-list">
          ${r.improvements.map(s => `<li>${s}</li>`).join('')}
        </ul>
        <p class="xai-section-title reasoning">🧠 AI Reasoning</p>
        <p style="font-size:0.82rem;color:var(--text-secondary);line-height:1.7;margin-top:var(--space-sm);">${r.reasoning}</p>
        <div style="margin-top:var(--space-lg);display:flex;gap:var(--space-md);">
          <button class="btn btn-success btn-sm" onclick="handleReferral(${r.id},'approve')">
            ${icons.check.replace(/width="22"/g,'width="14"').replace(/height="22"/g,'height="14"')}
            Approve Referral
          </button>
          <button class="btn btn-danger btn-sm" onclick="handleReferral(${r.id},'decline')">
            ${icons.missing.replace(/width="12"/g,'width="14"').replace(/height="12"/g,'height="14"')}
            Decline
          </button>
        </div>
      </div>
    </div>
  `).join('');
}

function toggleXAI(id) {
  const block = $(`#xai-${id}`);
  const toggle = block.previousElementSibling;
  block.classList.toggle('visible');
  toggle.classList.toggle('open');
  toggle.querySelector('span').textContent = block.classList.contains('visible') ? 'Hide XAI Justification' : 'View XAI Justification';
}

function handleReferral(id, action) {
  const item = $(`#referral-${id}`);
  if (action === 'approve') {
    showToast('Referral approved! Candidate has been notified.');
    item.style.opacity = '0.5';
    item.style.pointerEvents = 'none';
  } else {
    showToast('Referral declined. Feedback recorded.');
    item.style.opacity = '0.5';
    item.style.pointerEvents = 'none';
  }
}

// ─── Module 4: Communication Suite ───────────────────────────
function generateMessage() {
  const type = $('#comm-type').value;
  const company = $('#comm-company').value || 'Company';
  const role = $('#comm-role').value || 'Role';
  const recipient = $('#comm-recipient').value || 'Name';
  const tone = state.toneValue;

  const templates = messageTemplates[type];
  if (!templates) return;

  // Interpolate tone: blend formal + casual
  const formalWeight = 1 - (tone / 100);
  const useTemplate = tone <= 50 ? templates.formal : templates.casual;

  let text = useTemplate
    .replace(/\[Recipient_Name\]/g, recipient)
    .replace(/\[Company_Name\]/g, company)
    .replace(/\[Role_Title\]/g, role)
    .replace(/\[University_Name\]/g, 'Stanford University');

  $('#generated-text').innerHTML = text;
}

function copyToClipboard() {
  const text = $('#generated-text').innerText;
  navigator.clipboard.writeText(text).then(() => {
    showToast('Copied to clipboard!');
  }).catch(() => {
    // Fallback
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    showToast('Copied to clipboard!');
  });
}

// ─── Module 5: Kanban Board ──────────────────────────────────
function renderKanban() {
  const board = $('#kanban-board');
  board.innerHTML = kanbanColumns.map(col => {
    const cards = kanbanData[col.key] || [];
    return `
      <div class="kanban-column">
        <div class="kanban-column-header" style="border-bottom-color:${col.color}">
          <h4 style="color:${col.color}">${col.label}</h4>
          <span class="count">${cards.length}</span>
        </div>
        ${cards.map(card => `
          <div class="kanban-card" draggable="true">
            <h5>${card.name}</h5>
            <p>${card.role}</p>
            <div class="kanban-card-meta">
              <span>${card.date}</span>
              <span class="priority ${card.priority}">${card.priority}</span>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }).join('');

  // Simple drag-and-drop
  initDragDrop();
}

function initDragDrop() {
  const cards = $$('.kanban-card');
  const columns = $$('.kanban-column');

  cards.forEach(card => {
    card.addEventListener('dragstart', (e) => {
      card.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
    });
    card.addEventListener('dragend', () => {
      card.classList.remove('dragging');
      // Update counts
      columns.forEach(col => {
        const count = col.querySelectorAll('.kanban-card').length;
        col.querySelector('.count').textContent = count;
      });
    });
  });

  columns.forEach(col => {
    col.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      const dragging = document.querySelector('.dragging');
      if (dragging) {
        const afterElement = getDragAfterElement(col, e.clientY);
        if (afterElement) {
          col.insertBefore(dragging, afterElement);
        } else {
          col.appendChild(dragging);
        }
      }
    });
  });
}

function getDragAfterElement(container, y) {
  const elements = [...container.querySelectorAll('.kanban-card:not(.dragging)')];
  return elements.reduce((closest, child) => {
    const box = child.getBoundingClientRect();
    const offset = y - box.top - box.height / 2;
    if (offset < 0 && offset > closest.offset) {
      return { offset: offset, element: child };
    } else {
      return closest;
    }
  }, { offset: Number.NEGATIVE_INFINITY }).element;
}

// ─── Module 6: Analytics ─────────────────────────────────────
function renderAnalytics() {
  // Stats Cards
  const statsGrid = $('#stats-grid');
  statsGrid.innerHTML = analyticsStats.map(s => `
    <div class="stat-card">
      <div class="stat-icon" style="background:${s.color}15;color:${s.color}">
        ${icons[s.icon]}
      </div>
      <div class="stat-value">${s.value}</div>
      <div class="stat-label">${s.label}</div>
      <span class="stat-change ${s.positive ? 'positive' : 'negative'}">
        ${s.positive ? '↑' : '↓'} ${s.change}
      </span>
    </div>
  `).join('');

  // Funnel Chart
  const maxVal = funnelData[0].value;
  const funnelChart = $('#funnel-chart');
  funnelChart.innerHTML = funnelData.map(f => {
    const width = Math.max((f.value / maxVal) * 100, 15);
    return `
      <div class="funnel-stage">
        <span class="funnel-label">${f.label}</span>
        <div class="funnel-bar" style="width:${width}%;background:${f.color}">${f.value}</div>
      </div>
    `;
  }).join('');

  // Animate funnel bars
  requestAnimationFrame(() => {
    $$('.funnel-bar').forEach(bar => {
      const target = bar.style.width;
      bar.style.width = '0%';
      requestAnimationFrame(() => {
        bar.style.width = target;
      });
    });
  });
}

// ─── Toast Notification ──────────────────────────────────────
function showToast(message) {
  const toast = $('#toast');
  $('#toast-message').textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3000);
}

// ─── Mobile Sidebar ──────────────────────────────────────────
function toggleMobileSidebar() {
  const sidebar = $('#sidebar');
  const overlay = $('#sidebar-overlay');
  sidebar.classList.toggle('open');
  overlay.classList.toggle('active');
}

// ─── Event Bindings (Dashboard) ──────────────────────────────
let _eventsInitialized = false;
function initEvents() {
  if (_eventsInitialized) return;
  _eventsInitialized = true;

  // Theme
  $('#theme-toggle').addEventListener('click', toggleTheme);

  // Logout button (sidebar)
  $('#btn-logout').addEventListener('click', handleLogout);

  // Profile dropdown toggle
  const avatarBtn = $('#user-avatar');
  if (avatarBtn) {
    avatarBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const dropdown = $('#user-profile-dropdown');
      dropdown.classList.toggle('visible');
    });
  }

  // Dropdown logout button
  const dropdownLogout = $('#dropdown-logout-btn');
  if (dropdownLogout) {
    dropdownLogout.addEventListener('click', handleLogout);
  }

  // Close dropdown when clicking outside
  document.addEventListener('click', (e) => {
    const wrapper = $('#user-profile-wrapper');
    const dropdown = $('#user-profile-dropdown');
    if (wrapper && dropdown && !wrapper.contains(e.target)) {
      dropdown.classList.remove('visible');
    }
  });

  // Persona buttons
  $$('.persona-btn').forEach(btn => {
    btn.addEventListener('click', () => switchPersona(btn.dataset.persona));
  });

  // Nav items
  $$('.nav-item').forEach(item => {
    item.addEventListener('click', () => switchModule(item.dataset.module));
  });

  // Mobile
  $('#mobile-menu-btn').addEventListener('click', toggleMobileSidebar);
  $('#sidebar-overlay').addEventListener('click', toggleMobileSidebar);

  // Module 1: Analyze button
  $('#btn-analyze').addEventListener('click', runAnalysis);

  // Module 2: Search contacts
  $('#btn-search-contacts').addEventListener('click', () => {
    const company = $('#company-search').value.trim();
    if (company) renderContacts(company);
  });
  $('#company-search').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      const company = e.target.value.trim();
      if (company) renderContacts(company);
    }
  });

  // Module 4: Communication
  $('#btn-generate-msg').addEventListener('click', generateMessage);
  $('#btn-copy-msg').addEventListener('click', copyToClipboard);
  $('#btn-regenerate-msg').addEventListener('click', () => {
    generateMessage();
    showToast('Message regenerated with updated tone!');
  });
  $('#tone-slider').addEventListener('input', (e) => {
    state.toneValue = parseInt(e.target.value);
    $('#tone-value').textContent = state.toneValue + '%';
  });
  $('#comm-type').addEventListener('change', generateMessage);

  // Resume upload zone: real file picking + drag & drop (replaces the
  // previous decorative-only div that had no file input behind it).
  initResumeUpload();
}

let selectedResumeFile = null;

function initResumeUpload() {
  const zone = $('#resume-upload-zone');
  const fileInput = $('#resume-file-input');
  const label = $('#resume-upload-label');
  if (!zone || !fileInput) return;

  const setFile = (file) => {
    if (!file) return;
    selectedResumeFile = file;
    if (label) label.textContent = `Selected: ${file.name}`;
    zone.classList.add('has-file');
  };

  zone.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', (e) => setFile(e.target.files[0]));

  zone.addEventListener('dragover', (e) => {
    e.preventDefault();
    zone.classList.add('dragover');
  });
  zone.addEventListener('dragleave', () => zone.classList.remove('dragover'));
  zone.addEventListener('drop', (e) => {
    e.preventDefault();
    zone.classList.remove('dragover');
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
    }
  });
}

// ─── Login System ────────────────────────────────────────────

function initLoginEvents() {
  const loginPage = $('#login-page');
  if (!loginPage) return;

  // Login theme toggle
  const loginThemeToggle = $('#login-theme-toggle');
  if (loginThemeToggle) {
    loginThemeToggle.addEventListener('click', () => {
      toggleTheme();
      updateLoginThemeUI();
    });
  }

  // Sign In form
  const loginForm = $('#login-form');
  if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      handleLogin();
    });
  }

  // Sign Up form
  const signupForm = $('#signup-form');
  if (signupForm) {
    signupForm.addEventListener('submit', (e) => {
      e.preventDefault();
      handleSignup();
    });
  }

  // Toggle between sign in / sign up
  const showSignup = $('#show-signup');
  const showSignin = $('#show-signin');
  if (showSignup) {
    showSignup.addEventListener('click', (e) => {
      e.preventDefault();
      $('#signin-view').style.display = 'none';
      $('#signup-view').style.display = 'block';
    });
  }
  if (showSignin) {
    showSignin.addEventListener('click', (e) => {
      e.preventDefault();
      $('#signup-view').style.display = 'none';
      $('#signin-view').style.display = 'block';
    });
  }

  // Password visibility toggle
  const pwToggle = $('#password-toggle');
  if (pwToggle) {
    pwToggle.addEventListener('click', () => {
      const input = $('#login-password');
      const isPassword = input.type === 'password';
      input.type = isPassword ? 'text' : 'password';
      pwToggle.querySelector('.eye-open').style.display = isPassword ? 'none' : 'block';
      pwToggle.querySelector('.eye-closed').style.display = isPassword ? 'block' : 'none';
    });
  }

  // Password strength meter (sign-up)
  const signupPw = $('#signup-password');
  if (signupPw) {
    signupPw.addEventListener('input', () => {
      updatePasswordStrength(signupPw.value);
    });
  }

  // Social login buttons
  const socialBtns = document.querySelectorAll('.social-btn');
  socialBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      // LinkedIn button redirects to real OAuth 2.0 flow
      if (btn.id === 'social-linkedin' || btn.title?.toLowerCase().includes('linkedin')) {
        // This navigates to our backend's /auth/linkedin route which:
        // 1. Generates a crypto-secure state parameter (CSRF protection)
        // 2. Stores it in the server session
        // 3. Redirects to LinkedIn's authorization page
        window.location.href = '/auth/linkedin';
        return;
      }
      // Other social buttons use mock login
      handleLogin();
    });
  });

  // Forgot password link
  const forgotLink = $('#forgot-password-link');
  if (forgotLink) {
    forgotLink.addEventListener('click', (e) => {
      e.preventDefault();
      showToast('Password reset link sent to your email!');
    });
  }
}

function updateLoginThemeUI() {
  const isDark = state.theme === 'dark';
  const darkIcon = $('#login-theme-icon-dark');
  const lightIcon = $('#login-theme-icon-light');
  if (darkIcon) darkIcon.style.display = isDark ? 'block' : 'none';
  if (lightIcon) lightIcon.style.display = isDark ? 'none' : 'block';
}

function showAuthError(formSelector, message) {
  const existingError = document.querySelector('.login-error');
  if (existingError) existingError.remove();

  const form = $(formSelector);
  const errorEl = document.createElement('div');
  errorEl.className = 'login-error';
  errorEl.textContent = message;
  form.prepend(errorEl);
}

async function handleLogin() {
  const btn = $('#btn-login');
  const email = $('#login-email').value.trim();
  const password = $('#login-password').value;

  const existingError = document.querySelector('.login-error');
  if (existingError) existingError.remove();

  btn.classList.add('loading');
  try {
    const resp = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await resp.json();

    if (!resp.ok || !data.success) {
      showAuthError('#login-form', data.message || 'Incorrect email or password.');
      return;
    }

    state.user = data.user;
    await enterAppAfterAuth();
  } catch (err) {
    console.error('Login failed:', err);
    showAuthError('#login-form', 'Network error — could not reach the server.');
  } finally {
    btn.classList.remove('loading');
  }
}

async function handleSignup() {
  const btn = $('#btn-signup');
  const name = $('#signup-name').value.trim();
  const email = $('#signup-email').value.trim();
  const password = $('#signup-password').value;

  const existingError = document.querySelector('.login-error');
  if (existingError) existingError.remove();

  btn.classList.add('loading');
  try {
    const resp = await fetch('/api/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password }),
    });
    const data = await resp.json();

    if (!resp.ok || !data.success) {
      showAuthError('#signup-form', data.message || 'Could not create your account.');
      return;
    }

    state.user = data.user;
    // New users always go to onboarding wizard — data.user.onboarding is null.
    transitionToOnboarding();
  } catch (err) {
    console.error('Signup failed:', err);
    showAuthError('#signup-form', 'Network error — could not reach the server.');
  } finally {
    btn.classList.remove('loading');
  }
}

/**
 * Called after a successful login (or an existing session is found on
 * page load, or LinkedIn OAuth completes). Asks the server what this
 * account's real onboarding/persona state is and routes accordingly —
 * no more "everyone lands on the same dashboard" localStorage guessing.
 */
async function enterAppAfterAuth() {
  try {
    const resp = await fetch('/api/me');
    const data = await resp.json();

    if (!data.loggedIn) {
      return false;
    }

    state.user = data.user;

    if (data.linkedInProfile) {
      state.linkedInUser = data.linkedInProfile;
    }

    if (data.user.onboarding && data.user.personaLocked) {
      state.onboardingData = data.user.onboarding;
      const persona = data.user.onboarding.role === 'seeker' ? 'seeker' : 'employee';
      state.personaLocked = true;
      state.lockedPersona = persona;
      transitionToApp(persona);
    } else {
      transitionToOnboarding();
    }
    return true;
  } catch (err) {
    console.error('Could not load session:', err);
    return false;
  }
}

function transitionToApp(lockedPersona) {
  const loginPage = $('#login-page');
  const onboardingPage = $('#onboarding-page');
  const appLayout = $('#app-layout');

  // Hide whichever page is currently showing
  if (loginPage && !loginPage.classList.contains('hidden')) {
    loginPage.classList.add('hiding');
  }
  if (onboardingPage) {
    onboardingPage.style.display = 'none';
  }

  // After the fade animation, show the dashboard
  setTimeout(() => {
    if (loginPage) loginPage.classList.add('hidden');
    appLayout.style.display = 'flex';
    appLayout.style.opacity = '0';
    appLayout.style.transform = 'scale(0.98)';
    appLayout.style.transition = 'opacity 0.4s ease, transform 0.4s ease';

    // Trigger reflow then animate in
    void appLayout.offsetWidth;
    appLayout.style.opacity = '1';
    appLayout.style.transform = 'scale(1)';

    // Initialize dashboard
    initEvents();

    // Persona comes from the real per-account onboarding data (state.user /
    // state.onboardingData), populated by enterAppAfterAuth() — not from a
    // localStorage guess shared by whoever last used this browser.
    const persona = lockedPersona
      || (state.onboardingData ? (state.onboardingData.role === 'seeker' ? 'seeker' : 'employee') : null)
      || 'seeker';
    switchPersona(persona);

    // Populate profile UI with this account's real name/email
    applyAccountProfile();

    // Check for LinkedIn-specific profile data (avatar, etc.)
    fetchAndApplyLinkedInProfile();
  }, 500);
}

/**
 * Populate the sidebar/dropdown with the signed-in account's real
 * name and email instead of the previously hardcoded "Kushan Sharma".
 */
function applyAccountProfile() {
  if (!state.user) return;
  const initials = getInitials(state.user.name || state.user.email || 'U');

  const avatar = $('#user-avatar');
  if (avatar && !state.linkedInUser) avatar.textContent = initials;

  const dropdownAvatar = $('#dropdown-avatar');
  if (dropdownAvatar && !state.linkedInUser) dropdownAvatar.textContent = initials;

  const dropdownName = $('#dropdown-name');
  if (dropdownName) dropdownName.textContent = state.user.name || 'Account';

  const dropdownEmail = $('#dropdown-email');
  if (dropdownEmail) dropdownEmail.textContent = state.user.email || '';
}

// ─── Onboarding Wizard ───────────────────────────────────────

/**
 * Transition from login page to onboarding wizard.
 * Called after a new user signs up.
 */
function transitionToOnboarding() {
  const loginPage = $('#login-page');
  const onboardingPage = $('#onboarding-page');

  loginPage.classList.add('hiding');

  setTimeout(() => {
    loginPage.classList.add('hidden');
    onboardingPage.style.display = 'flex';
    onboardingPage.style.opacity = '0';
    onboardingPage.style.transition = 'opacity 0.4s ease';

    void onboardingPage.offsetWidth;
    onboardingPage.style.opacity = '1';
  }, 500);
}

/**
 * Handle role card click on step 1 of onboarding.
 * Shows the appropriate step 2 form (seeker or employee).
 */
function selectOnboardingRole(role) {
  // Hide step 1
  $('#onboarding-step-1').classList.remove('active');

  // Update step indicator
  const dots = $$('.step-dot');
  dots[0].classList.remove('active');
  dots[0].classList.add('completed');
  dots[1].classList.add('active');
  $('.step-connector').classList.add('active');

  // Show the appropriate step 2
  if (role === 'seeker') {
    $('#onboarding-step-seeker').classList.add('active');
  } else {
    $('#onboarding-step-employee').classList.add('active');
  }
}

/**
 * Go back from step 2 to step 1 (role selection).
 */
function goBackToRoleSelection() {
  // Hide both step 2 forms
  $('#onboarding-step-seeker').classList.remove('active');
  $('#onboarding-step-employee').classList.remove('active');

  // Reset step indicator
  const dots = $$('.step-dot');
  dots[0].classList.add('active');
  dots[0].classList.remove('completed');
  dots[1].classList.remove('active');
  $('.step-connector').classList.remove('active');

  // Show step 1
  $('#onboarding-step-1').classList.add('active');
}

/**
 * Toggle the referral acceptance option on the employee form.
 */
function setReferralToggle(accepts) {
  state.acceptsReferrals = accepts;
  $('#referral-yes').classList.toggle('active', accepts);
  $('#referral-no').classList.toggle('active', !accepts);
}

/**
 * Complete onboarding — collect form data, save it server-side against
 * THIS account, then launch the dashboard locked to the chosen persona.
 */
async function completeOnboarding(role) {
  let onboardingData = { role: role };

  if (role === 'seeker') {
    const targetRole = $('#ob-target-role').value.trim();
    if (!targetRole) {
      showToast('Please enter your target role.');
      return;
    }
    onboardingData = {
      ...onboardingData,
      targetRole: targetRole,
      skills: $('#ob-skills').value.trim(),
      experience: $('#ob-experience').value,
      education: $('#ob-education').value,
      targetCompanies: $('#ob-companies').value.trim(),
    };
  } else {
    const company = $('#ob-company').value.trim();
    const title = $('#ob-role').value.trim();
    if (!company || !title) {
      showToast('Please fill in your company and role.');
      return;
    }
    onboardingData = {
      ...onboardingData,
      company: company,
      title: title,
      department: $('#ob-department').value,
      tenure: $('#ob-tenure').value,
      acceptsReferrals: state.acceptsReferrals,
    };
  }

  try {
    const resp = await fetch('/api/onboarding', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(onboardingData),
    });
    const data = await resp.json();

    if (!resp.ok || !data.success) {
      showToast(data.message || 'Could not save onboarding — please try again.');
      return;
    }

    state.onboardingData = data.user.onboarding;
    const persona = role === 'seeker' ? 'seeker' : 'employee';
    state.personaLocked = true;
    state.lockedPersona = persona;

    transitionToApp(persona);
    showToast(`Welcome! Your ${role === 'seeker' ? 'job seeker' : 'employee'} dashboard is ready.`);
  } catch (err) {
    console.error('Onboarding save failed:', err);
    showToast('Network error — could not reach the server.');
  }
}

/**
 * Legacy fallback: get saved persona from localStorage if the server
 * is unreachable. The server-provided state.onboardingData is always
 * preferred (see enterAppAfterAuth).
 */
function getSavedPersona() {
  try {
    const saved = localStorage.getItem('reachai-onboarding');
    if (saved) {
      const data = JSON.parse(saved);
      state.onboardingData = data;
      return data.role === 'seeker' ? 'seeker' : 'employee';
    }
  } catch (e) {
    console.log('Could not read onboarding data:', e);
  }
  return null;
}

// ─── Logout System ───────────────────────────────────────────

function handleLogout() {
  const appLayout = $('#app-layout');
  const loginPage = $('#login-page');

  // Close the profile dropdown if open
  const dropdown = $('#user-profile-dropdown');
  if (dropdown) dropdown.classList.remove('visible');

  // Animate the dashboard out
  appLayout.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
  appLayout.style.opacity = '0';
  appLayout.style.transform = 'scale(0.98)';

  // Call server logout to clear session
  fetch('/api/logout', { method: 'POST' }).catch(() => {});

  // Clear all account/session state
  state.user = null;
  state.linkedInUser = null;
  state.personaLocked = false;
  state.lockedPersona = null;
  state.onboardingData = null;
  selectedResumeFile = null;
  localStorage.removeItem('reachai-onboarding');

  setTimeout(() => {
    appLayout.style.display = 'none';
    appLayout.style.opacity = '';
    appLayout.style.transform = '';
    appLayout.style.transition = '';

    // Show login page again
    loginPage.classList.remove('hiding', 'hidden');
    loginPage.style.opacity = '0';
    loginPage.style.transform = 'scale(1.02)';

    void loginPage.offsetWidth;
    loginPage.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
    loginPage.style.opacity = '1';
    loginPage.style.transform = 'scale(1)';

    // Clear form fields
    const emailInput = $('#login-email');
    const passInput = $('#login-password');
    if (emailInput) emailInput.value = '';
    if (passInput) passInput.value = '';

    // Reset user display to defaults
    resetUserDisplay();

    showToast('Signed out successfully');

    // Clean up transition styles after animation
    setTimeout(() => {
      loginPage.style.opacity = '';
      loginPage.style.transform = '';
      loginPage.style.transition = '';
    }, 500);
  }, 400);
}

function resetUserDisplay() {
  // Reset avatar
  const avatar = $('#user-avatar');
  if (avatar) {
    avatar.textContent = '';
    avatar.style.backgroundImage = '';
  }

  // Reset dropdown
  const dropdownAvatar = $('#dropdown-avatar');
  if (dropdownAvatar) {
    dropdownAvatar.innerHTML = '';
  }
  const dropdownName = $('#dropdown-name');
  if (dropdownName) dropdownName.textContent = '';
  const dropdownEmail = $('#dropdown-email');
  if (dropdownEmail) dropdownEmail.textContent = '';
  const dropdownProvider = $('#dropdown-provider');
  if (dropdownProvider) dropdownProvider.style.display = 'none';
}

// ─── LinkedIn Profile Integration ────────────────────────────

/**
 * Fetch user data from the backend session and apply LinkedIn profile.
 * Also checks token health and warns if expiring soon.
 */
async function fetchAndApplyLinkedInProfile() {
  try {
    const response = await fetch('/api/user');
    const data = await response.json();

    if (data.loggedIn && data.user) {
      state.linkedInUser = data.user;
      applyLinkedInProfile(data.user);

      // ── Token Health Monitoring ──
      // The backend now returns tokenHealth with expiration info.
      // If the token is expiring soon, attempt a silent refresh
      // or warn the user to re-authenticate.
      if (data.tokenHealth) {
        checkTokenHealth(data.tokenHealth);
      }
    }
  } catch (err) {
    // Server not running or endpoint unavailable — silently ignore
    console.log('LinkedIn profile check skipped (no server)');
  }
}

/**
 * Monitor token health and take action on expiring/expired tokens.
 *
 * LinkedIn access tokens expire after 60 days.
 * Refresh tokens (if available) expire after 365 days.
 * Most "Sign In with LinkedIn" apps do NOT get refresh tokens,
 * so the fallback is to prompt the user to re-authenticate.
 */
async function checkTokenHealth(tokenHealth) {
  if (!tokenHealth) return;

  if (tokenHealth.isExpired) {
    // Token has expired — try refresh, or prompt re-login
    if (tokenHealth.canRefresh) {
      try {
        const refreshResp = await fetch('/api/token/refresh', { method: 'POST' });
        const refreshData = await refreshResp.json();

        if (refreshData.success) {
          showToast('LinkedIn session refreshed successfully.');
          return;
        }
      } catch (e) {
        console.log('Silent token refresh failed:', e);
      }
    }
    // Refresh not available or failed — user must re-authenticate
    showToast('Your LinkedIn session has expired. Please sign in again.');
    return;
  }

  if (tokenHealth.isExpiringSoon) {
    // Token is expiring within 7 days — warn the user
    const days = tokenHealth.remainingDays;
    if (tokenHealth.canRefresh) {
      // Attempt silent refresh
      try {
        const refreshResp = await fetch('/api/token/refresh', { method: 'POST' });
        const refreshData = await refreshResp.json();
        if (refreshData.success) {
          showToast('LinkedIn session automatically refreshed.');
          return;
        }
      } catch (e) {
        console.log('Silent token refresh failed:', e);
      }
    }
    showToast(`LinkedIn token expires in ${days} day${days !== 1 ? 's' : ''}. Consider re-authenticating.`);
  }
}

function applyLinkedInProfile(user) {
  // Generate initials
  const initials = getInitials(user.fullName || user.firstName + ' ' + user.lastName);

  // Update top bar avatar
  const avatar = $('#user-avatar');
  if (avatar) {
    if (user.picture) {
      avatar.textContent = '';
      avatar.style.backgroundImage = `url(${user.picture})`;
      avatar.style.backgroundSize = 'cover';
      avatar.style.backgroundPosition = 'center';
    } else {
      avatar.textContent = initials;
    }
  }

  // Update profile dropdown
  const dropdownAvatar = $('#dropdown-avatar');
  if (dropdownAvatar) {
    if (user.picture) {
      dropdownAvatar.innerHTML = `<img src="${user.picture}" alt="${user.fullName}">`;
    } else {
      dropdownAvatar.textContent = initials;
    }
  }

  const dropdownName = $('#dropdown-name');
  if (dropdownName) dropdownName.textContent = user.fullName || 'LinkedIn User';

  const dropdownEmail = $('#dropdown-email');
  if (dropdownEmail) dropdownEmail.textContent = user.email || '';

  const dropdownProvider = $('#dropdown-provider');
  if (dropdownProvider && user.provider === 'linkedin') {
    dropdownProvider.style.display = 'inline-flex';
  }

  // Populate LinkedIn text in the Job Analyzer resume section
  const linkedinTextInput = $('#linkedin-text-input');
  if (linkedinTextInput && user.fullName) {
    // Build a profile text from LinkedIn data
    let profileText = `${user.fullName}`;
    if (user.email) profileText += `\nEmail: ${user.email}`;
    profileText += `\n\nProfile imported from LinkedIn.`;
    profileText += `\n\n(Note: Detailed experience, skills, and education require the LinkedIn API\'s "Member Data Portability" product approval. Contact LinkedIn Developer Support to request full profile access.)`;
    linkedinTextInput.value = profileText;
  }

  // Pre-fill communication suite with user name
  const commRecipient = $('#comm-recipient');
  if (commRecipient && !commRecipient.value) {
    // Don't overwrite — the recipient is the person being contacted, not the logged-in user
  }

  showToast(`Welcome, ${user.firstName || user.fullName}! Profile loaded from LinkedIn.`);
}

function getInitials(name) {
  if (!name) return '??';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return parts[0].substring(0, 2).toUpperCase();
}

// ─── Check for LinkedIn Auth on Page Load ────────────────────

/**
 * Parse URL parameters after LinkedIn OAuth redirect.
 * The backend appends ?auth_success=true or ?auth_error=<code>
 * when redirecting back from the OAuth callback.
 *
 * This provides user-friendly error messages for each known failure mode
 * so users understand what went wrong and how to fix it.
 */
function checkLinkedInAuth() {
  const params = new URLSearchParams(window.location.search);

  if (params.get('auth_success') === 'true') {
    // LinkedIn login succeeded — the server already established a real
    // session (see /auth/linkedin/callback), so just load it and route
    // to onboarding or the dashboard based on this account's actual state.
    window.history.replaceState({}, '', '/');  // Clean URL of OAuth params
    enterAppAfterAuth();
    return;
  }

  if (params.get('auth_error')) {
    const error = params.get('auth_error');
    const detail = params.get('detail') || '';
    const description = params.get('error_description') || '';

    // ── Map OAuth error codes to user-friendly messages ──
    const errorMessages = {
      // LinkedIn-side errors
      'user_cancelled_login': 'You cancelled the LinkedIn sign-in.',
      'user_cancelled_authorize': 'You cancelled the LinkedIn authorization.',
      'access_denied': 'Access was denied. Please try again and grant the required permissions.',

      // Our server-side errors
      'state_mismatch': 'Security check failed (CSRF). Please try signing in again.',
      'auth_timeout': 'Sign-in took too long. Please try again.',
      'missing_code': 'No authorization code received from LinkedIn. Please try again.',
      'token_exchange_failed': detail === 'invalid_redirect_uri'
        ? 'Redirect URI mismatch. The app\'s callback URL doesn\'t match what\'s registered in LinkedIn.'
        : detail === 'invalid_grant'
        ? 'Authorization code expired. Please try signing in again.'
        : 'Failed to exchange authorization code for token. Please try again.',
      'profile_fetch_failed': 'Could not retrieve your LinkedIn profile. Please try again.',
      'server_error': 'An unexpected server error occurred. Please try again later.',
    };

    const message = errorMessages[error]
      || description
      || `LinkedIn login failed: ${error.replace(/_/g, ' ')}`;

    window.history.replaceState({}, '', '/');  // Clean URL
    showToast(message);
  }
}

function updatePasswordStrength(password) {
  const bars = document.querySelectorAll('#password-strength .strength-bar');
  const label = $('#strength-label');
  let strength = 0;

  if (password.length >= 8) strength++;
  if (/[A-Z]/.test(password)) strength++;
  if (/[0-9]/.test(password)) strength++;
  if (/[^A-Za-z0-9]/.test(password)) strength++;

  const levels = ['', 'weak', 'fair', 'good', 'strong'];
  const labels = ['', 'Weak', 'Fair', 'Good', 'Strong'];
  const colors = ['', 'var(--color-danger)', 'var(--color-warning)', '#3b82f6', 'var(--color-success)'];

  bars.forEach((bar, i) => {
    bar.className = 'strength-bar';
    if (i < strength && password.length > 0) {
      bar.classList.add(levels[strength]);
    }
  });

  if (label) {
    label.textContent = password.length > 0 ? labels[strength] : '';
    label.style.color = colors[strength] || '';
  }
}

// ─── Initialize ──────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  updateLoginThemeUI();
  initLoginEvents();

  const params = new URLSearchParams(window.location.search);
  const hasOAuthParams = params.get('auth_success') || params.get('auth_error');

  if (hasOAuthParams) {
    // Coming back from the LinkedIn OAuth redirect — handled separately.
    checkLinkedInAuth();
  } else {
    // Normal page load/refresh — check whether a real session cookie is
    // still valid, and if so route straight into the app (no localStorage
    // guessing involved).
    enterAppAfterAuth();
  }
});

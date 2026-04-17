// â”€â”€â”€ Issuer Tier Database â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Each tier has a base point value per certification

export const ISSUER_TIERS = {
  tier1: {
    label: 'Elite',
    points: 6,
    color: '#f5c842',
    bg: 'rgba(245,200,66,0.12)',
    border: 'rgba(245,200,66,0.35)',
    issuers: [
      'google', 'aws', 'amazon web services', 'microsoft', 'meta', 'facebook',
      'apple', 'ibm', 'oracle', 'cisco', 'comptia', 'pmi', 'salesforce',
      'red hat', 'vmware', 'kubernetes', 'linux foundation', 'cncf',
      'isaca', 'isc2', '(isc)Â²', 'ec-council', 'sans institute',
      'harvard', 'mit', 'stanford', 'yale', 'princeton', 'oxford',
      'cambridge', 'carnegie mellon', 'caltech', 'iit', 'nit',
      'databricks', 'snowflake', 'hashicorp', 'docker', 'nvidia',
      'tensorflow', 'deepmind', 'openai', 'anthropic'
    ]
  },
  tier2: {
    label: 'Recognized',
    points: 3,
    color: '#6c63ff',
    bg: 'rgba(108,99,255,0.12)',
    border: 'rgba(108,99,255,0.3)',
    issuers: [
      'coursera', 'edx', 'udacity', 'linkedin learning', 'pluralsight',
      'datacamp', 'codecademy', 'freecodecamp', 'mongodb university',
      'tableau', 'atlassian', 'hubspot', 'semrush', 'hootsuite',
      'google digital garage', 'microsoft learn', 'aws training',
      'adobe', 'autodesk', 'unity', 'unreal', 'jetbrains',
      'scrum alliance', 'scrum.org', 'axelos', 'prince2', 'itil',
      'palo alto', 'fortinet', 'juniper', 'f5', 'splunk',
      'elastic', 'confluent', 'cloudera', 'hortonworks'
    ]
  },
  tier3: {
    label: 'Standard',
    points: 1,
    color: '#22d3a0',
    bg: 'rgba(34,211,160,0.1)',
    border: 'rgba(34,211,160,0.25)',
    issuers: [] // everything else
  }
};

// â”€â”€â”€ Platform Tiers for Courses â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const PLATFORM_TIERS = {
  tier1: {
    label: 'Premium',
    points: 4,
    color: '#f5c842',
    platforms: [
      'coursera', 'edx', 'mit opencourseware', 'linkedin learning',
      'pluralsight', 'udacity', 'harvard online', 'stanford online',
      'datacamp', 'oreilly', 'safari books'
    ]
  },
  tier2: {
    label: 'Popular',
    points: 2,
    color: '#6c63ff',
    platforms: [
      'udemy', 'skillshare', 'codecademy', 'freecodecamp',
      'treehouse', 'frontendmasters', 'egghead', 'scrimba',
      'zerotomastery', 'academind', 'packt'
    ]
  },
  tier3: {
    label: 'Self-paced',
    points: 1,
    color: '#22d3a0',
    platforms: []
  }
};

// â”€â”€â”€ Duration Keywords â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Used when no expiry date is available â€” detect from title
const LONG_DURATION_KEYWORDS   = ['specialization', 'nanodegree', 'professional certificate', 'bootcamp', 'fellowship', 'residency', 'degree'];
const MEDIUM_DURATION_KEYWORDS = ['course', 'program', 'training', 'certification track', 'learning path', 'masterclass'];
const SHORT_DURATION_KEYWORDS  = ['workshop', 'webinar', 'tutorial', 'crash course', 'intro', 'introduction', 'basics', 'fundamentals'];

// â”€â”€â”€ Research Venue Tiers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const TIER1_VENUES = ['ieee', 'acm', 'nature', 'science', 'cell', 'lancet', 'nejm', 'arxiv', 'neurips', 'icml', 'cvpr', 'iclr', 'aaai', 'elsevier', 'springer'];
const TIER2_VENUES = ['researchgate', 'academia', 'ssrn', 'hindawi', 'mdpi', 'plos', 'frontiers'];


// â”€â”€â”€ Core Scoring Functions â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/**
 * Get issuer tier for a given issuer string
 */
export const getIssuerTier = (issuer = '') => {
  if (!issuer) return ISSUER_TIERS.tier3;
  const lower = issuer.toLowerCase().trim();

  if (ISSUER_TIERS.tier1.issuers.some(i => lower.includes(i)))
    return ISSUER_TIERS.tier1;
  if (ISSUER_TIERS.tier2.issuers.some(i => lower.includes(i)))
    return ISSUER_TIERS.tier2;
  return ISSUER_TIERS.tier3;
};

/**
 * Get platform tier for a given platform string
 */
export const getPlatformTier = (platform = '') => {
  if (!platform) return PLATFORM_TIERS.tier3;
  const lower = platform.toLowerCase().trim();

  if (PLATFORM_TIERS.tier1.platforms.some(p => lower.includes(p)))
    return PLATFORM_TIERS.tier1;
  if (PLATFORM_TIERS.tier2.platforms.some(p => lower.includes(p)))
    return PLATFORM_TIERS.tier2;
  return PLATFORM_TIERS.tier3;
};

/**
 * Estimate duration category from expiry - issue dates OR title keywords
 * Returns: 'long' (12+ months) | 'medium' (3â€“12 months) | 'short' (<3 months) | 'unknown'
 */
export const estimateDuration = (issueDate, expiryDate, title = '') => {
  // Try date-based duration first
  if (issueDate && expiryDate) {
    const start  = new Date(issueDate);
    const end    = new Date(expiryDate);
    const months = (end - start) / (1000 * 60 * 60 * 24 * 30);

    if (months >= 12) return 'long';
    if (months >= 3)  return 'medium';
    return 'short';
  }

  // Fallback: title keyword detection
  const lower = title.toLowerCase();
  if (LONG_DURATION_KEYWORDS.some(k   => lower.includes(k))) return 'long';
  if (MEDIUM_DURATION_KEYWORDS.some(k => lower.includes(k))) return 'medium';
  if (SHORT_DURATION_KEYWORDS.some(k  => lower.includes(k))) return 'short';
  return 'unknown';
};

/**
 * Check if a certification is currently active (not expired)
 */
export const isActive = (expiryDate) => {
  if (!expiryDate) return true; // no expiry = lifetime cert
  return new Date(expiryDate) > new Date();
};

/**
 * Check if a certification is recent (issued within last 2 years)
 */
export const isRecent = (issueDate) => {
  if (!issueDate) return false;
  const twoYearsAgo = new Date();
  twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
  return new Date(issueDate) >= twoYearsAgo;
};

/**
 * Score a single certification â€” returns points + breakdown
 */
export const scoreCertification = (cert) => {
  const breakdown = [];
  let total = 0;

  // 1. Issuer prestige
  const tier = getIssuerTier(cert.issuer);
  total += tier.points;
  breakdown.push({
    label:  `Issuer: ${tier.label}`,
    points: tier.points,
    color:  tier.color
  });

  // 2. Duration bonus
  const duration = estimateDuration(cert.issueDate, cert.expiryDate, cert.title);
  const durationPts = duration === 'long' ? 3 : duration === 'medium' ? 2 : duration === 'short' ? 1 : 1;
  total += durationPts;
  breakdown.push({
    label:  duration === 'long'   ? 'Duration: 12+ months'  :
            duration === 'medium' ? 'Duration: 3â€“12 months' :
            duration === 'short'  ? 'Duration: <3 months'   : 'Duration: Standard',
    points: durationPts,
    color:  duration === 'long' ? '#22d3a0' : duration === 'medium' ? '#6c63ff' : '#ff9f43'
  });

  // 3. Verifiability â€” has credential URL
  if (cert.credentialUrl) {
    total += 1;
    breakdown.push({ label: 'Verifiable URL', points: 1, color: '#22d3a0' });
  }

  // 4. Has credential ID
  if (cert.credentialId) {
    total += 1;
    breakdown.push({ label: 'Credential ID', points: 1, color: '#22d3a0' });
  }

  // 5. Currently active (not expired)
  if (isActive(cert.expiryDate)) {
    total += 1;
    breakdown.push({ label: 'Currently Active', points: 1, color: '#22d3a0' });
  } else {
    breakdown.push({ label: 'Expired', points: 0, color: '#ff5e7a' });
  }

  // 6. Recency bonus
  if (isRecent(cert.issueDate)) {
    total += 1;
    breakdown.push({ label: 'Recent (< 2 yrs)', points: 1, color: '#6c63ff' });
  }

  // 7. Lifetime cert bonus (no expiry = vendor trusts it permanently)
  if (!cert.expiryDate && cert.issueDate) {
    total += 1;
    breakdown.push({ label: 'Lifetime Cert', points: 1, color: '#f5c842' });
  }

  return { total: Math.min(14, total), breakdown, tier };
};

/**
 * Score a single course â€” returns points + breakdown
 */
export const scoreCourse = (course) => {
  const breakdown = [];
  let total = 0;

  // 1. Platform prestige
  const tier = getPlatformTier(course.platform);
  total += tier.points;
  breakdown.push({ label: `Platform: ${tier.label}`, points: tier.points, color: tier.color });

  // 2. Has certificate URL (verifiable)
  if (course.certificateUrl) {
    total += 1;
    breakdown.push({ label: 'Certificate URL', points: 1, color: '#22d3a0' });
  }

  // 3. Skills count (depth of learning)
  const skillCount = Array.isArray(course.skills)
    ? course.skills.length
    : (course.skills || '').split(',').filter(Boolean).length;

  if (skillCount >= 5) {
    total += 2;
    breakdown.push({ label: `${skillCount} skills listed`, points: 2, color: '#6c63ff' });
  } else if (skillCount >= 2) {
    total += 1;
    breakdown.push({ label: `${skillCount} skills listed`, points: 1, color: '#6c63ff' });
  }

  // 4. Recency
  if (isRecent(course.completionDate)) {
    total += 1;
    breakdown.push({ label: 'Completed recently', points: 1, color: '#22d3a0' });
  }

  // 5. Has instructor (structured course, not self-study)
  if (course.instructor) {
    total += 1;
    breakdown.push({ label: 'Instructor-led', points: 1, color: '#ff9f43' });
  }

  return { total: Math.min(9, total), breakdown, tier };
};

/**
 * Score a research paper
 */
export const scoreResearchPaper = (paper) => {
  const breakdown = [];
  let total = 0;
  const venue = (paper.platform || '').toLowerCase();

  // Venue prestige
  if (TIER1_VENUES.some(v => venue.includes(v))) {
    total += 6;
    breakdown.push({ label: 'Tier 1 Venue (IEEE/ACM/Nature)', points: 6, color: '#f5c842' });
  } else if (TIER2_VENUES.some(v => venue.includes(v))) {
    total += 3;
    breakdown.push({ label: 'Tier 2 Venue', points: 3, color: '#6c63ff' });
  } else {
    total += 1;
    breakdown.push({ label: 'Published', points: 1, color: '#22d3a0' });
  }

  // Has DOI / URL
  if (paper.url) {
    total += 2;
    breakdown.push({ label: 'DOI / Accessible URL', points: 2, color: '#22d3a0' });
  }

  // Has description / abstract
  if (paper.description && paper.description.length > 50) {
    total += 1;
    breakdown.push({ label: 'Abstract provided', points: 1, color: '#6c63ff' });
  }

  // Recency
  if (isRecent(paper.publishDate)) {
    total += 1;
    breakdown.push({ label: 'Published recently', points: 1, color: '#22d3a0' });
  }

  return { total: Math.min(10, total), breakdown };
};

/**
 * Calculate total credentials score from all items
 * This replaces the simple count-based approach in scoringService.js
 */
export const calculateTotalCredentialsScore = (certifications = [], courses = [], publications = []) => {
  const certScores    = certifications.map(scoreCertification);
  const courseScores  = courses.map(scoreCourse);
  const researchScores = publications
    .filter(p => p.publicationType === 'research')
    .map(scoreResearchPaper);

  // Sum but apply diminishing returns past a threshold
  const sumWithDiminishing = (scores, maxPerItem, diminishAfter) =>
    scores.reduce((total, s, idx) => {
      const pts = Math.min(s.total, maxPerItem);
      // After `diminishAfter` items, each additional gives 50% value
      return total + (idx < diminishAfter ? pts : pts * 0.5);
    }, 0);

  const certTotal    = sumWithDiminishing(certScores,    14, 5);
  const courseTotal  = sumWithDiminishing(courseScores,   9, 5);
  const researchTotal = sumWithDiminishing(researchScores,10, 3);

  const raw = certTotal + courseTotal + researchTotal;
  return Math.min(20, Math.round(raw)); // cap at 20 (max in scoring system)
};

// â”€â”€â”€ LinkedIn & Form Validation Utilities (moved here to consolidate) â”€â”€â”€

/**
 * Parse formatted number input (e.g., "5K", "1.2M") to integer
 */
export const parseFormattedNumber = (input) => {
  if (!input) return null;

  const str = String(input).trim().toUpperCase();
  const regex = /^([\d.]+)([KMB])?$/;
  const match = str.match(regex);

  if (!match) return null;

  let num = parseFloat(match[1]);
  const unit = match[2];

  if (isNaN(num)) return null;

  if (unit === 'K') num *= 1000;
  if (unit === 'M') num *= 1000000;
  if (unit === 'B') num *= 1000000000;

  if (num < 0 || num > 100000000) return null;

  return Math.floor(num);
};

export const formatNumberForDisplay = (num) => {
  if (!num) return '0';

  if (num >= 1000000) {
    return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  }
  return String(num);
};

export const validateLinkedInUrl = (url) => {
  if (!url) return false;
  const regex = /^https:\/\/(www\.)?linkedin\.com\/in\/[a-zA-Z0-9-]+\/?$/;
  return regex.test(url);
};

export const normalizeLinkedInUrl = (url) => {
  if (!url) return '';

  let normalized = url.toLowerCase().trim();

  if (!normalized.startsWith('http')) {
    normalized = 'https://' + normalized;
  }

  if (!normalized.includes('://www.')) {
    normalized = normalized.replace('://', '://www.');
  }

  normalized = normalized.replace(/\/$/, '');

  return normalized;
};

export const extractLinkedInUsername = (url) => {
  if (!url) return null;
  const match = url.match(/linkedin\.com\/in\/([a-zA-Z0-9-]+)/i);
  return match ? match[1] : null;
};

export const validateEmail = (email) => {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
};

export const validateDateFormat = (dateStr) => {
  if (!dateStr) return false;
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dateStr)) return false;

  const date = new Date(dateStr);
  return !isNaN(date.getTime());
};

export const validateDateRange = (startDate, endDate) => {
  if (!validateDateFormat(startDate)) return false;
  if (endDate && !validateDateFormat(endDate)) return false;

  if (endDate) {
    return new Date(startDate) <= new Date(endDate);
  }

  return new Date(startDate) <= new Date();
};

export const validateSkill = (skill) => {
  if (!skill) return false;

  const trimmed = skill.trim();
  return /^[a-zA-Z0-9\s.-]{2,50}$/.test(trimmed);
};

export const sanitizeSkills = (skillsInput) => {
  if (!skillsInput) return [];

  return skillsInput
    .split(',')
    .map(s => s.trim())
    .filter(s => validateSkill(s))
    .filter((s, i, arr) => arr.indexOf(s) === i);
};

export const validateTitle = (title) => {
  if (!title) return false;
  const trimmed = title.trim();
  return trimmed.length >= 2 && trimmed.length <= 100;
};

export const validateCompany = (company) => {
  if (!company) return false;
  const trimmed = company.trim();
  return trimmed.length >= 2 && trimmed.length <= 100;
};

export const validateDescription = (text, minLength = 0, maxLength = 1000) => {
  if (!text) return minLength === 0;
  const trimmed = text.trim();
  return trimmed.length >= minLength && trimmed.length <= maxLength;
};

export const getValidationError = (field, value, type) => {
  const fieldName = field.charAt(0).toUpperCase() + field.slice(1);

  switch (type) {
    case 'required':
      return `${fieldName} is required`;
    case 'number':
      return `${fieldName} must be a valid number`;
    case 'url':
      return `${fieldName} must be a valid LinkedIn URL`;
    case 'email':
      return `${fieldName} must be a valid email`;
    case 'date':
      return `${fieldName} must be in YYYY-MM-DD format`;
    case 'dateRange':
      return `Start date must be before end date`;
    case 'minLength':
      return `${fieldName} must be at least 2 characters`;
    case 'maxLength':
      return `${fieldName} cannot exceed maximum length`;
    case 'skill':
      return `Skill must be 2-50 characters, alphanumeric only`;
    default:
      return `${fieldName} is invalid`;
  }
};
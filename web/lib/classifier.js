/**
 * Email classifier — JavaScript port of tools/journal_manager/classifier.py
 * Pure regex scoring, no network calls, runs in Next.js API routes.
 */

const REPUTABLE_DOMAINS = new Set([
  'nature.com', 'springer.com', 'springernature.com',
  'elsevier.com', 'cell.com', 'lancet.com',
  'wiley.com', 'wileyonlinelibrary.com',
  'acs.org', 'rsc.org', 'ieee.org', 'acm.org',
  'aps.org', 'iop.org',
  'plos.org', 'public.plos.org',
  'frontiersin.org', 'mdpi.com', 'hindawi.com',
  'biomedcentral.com',
  'royalsocietypublishing.org',
  'oup.com', 'oxfordjournals.org', 'oxford.ac.uk',
  'cambridge.org',
  'pnas.org', 'science.org', 'sciencemag.org',
  'thelancet.com', 'bmj.com', 'nejm.org',
  'karger.com', 'lww.com',
  'taylorandfrancis.com', 'tandfonline.com',
  'sagepub.com', 'degruyter.com',
]);

const SUSPICIOUS_DOMAINS = new Set([
  'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com',
  '163.com', 'qq.com', 'mail.com',
]);

const DOMAIN_KEYWORDS = [
  'lipid', 'lipidom', 'mass spectr', 'metabol', 'proteom',
  'bioinformat', 'computational biology', 'systems biology',
  'membrane', 'cellular', 'molecular',
  'neural', 'neuroscien', 'brain', 'cognit', 'conscious',
  'physics', 'quantum', 'thermodynam', 'statistical mechanic',
  'entropy', 'phase space', 'dynamical system',
  'machine learning', 'deep learning', 'neural network',
  'artificial intelligence', 'language model',
  'astronomy', 'astrophys', 'cosmolog', 'galactic',
  'microscop', 'imaging', 'spectroscop',
  'pharmacol', 'drug', 'therapeut',
  'financ', 'econom', 'quantitative',
  'philosoph', 'complex system', 'information theory',
  'emergence', 'self-organiz',
];

// [regex, score_delta, label]  positive = spam signal, negative = legit signal
const SIGNALS = [
  [/\bDear\s+(Author|Researcher|Scientist|Scholar|Doctor|Sir|Madam|Colleague)\b/i, +25,
    'Generic salutation ("Dear Researcher/Author/Scientist")'],
  [/\bDear\s+(?:Dr\.?\s+|Prof\.?\s+)?[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?\b/, -20,
    'Personalised salutation (name used)'],
  [/\b(?:your (?:paper|article|manuscript|work|study|research)|entitled|titled|DOI:|doi\.org)\b/i, -25,
    'References specific paper/work'],
  [/\b(?:waive|waiver|free of charge|no (?:publication |article )?(?:fee|charge|cost)|complimentary|at no cost)\b/i, -20,
    'Explicit fee waiver offered'],
  [/\b(?:publish (?:within|in) \d+ days?|fast.?track|rapid publication|7[- ]day|within a week)\b/i, +20,
    'Unrealistic turnaround promise'],
  [/\b(?:article processing charge|APC|submission fee|publication fee|processing fee)\b/i, +15,
    'Requests publication fee'],
  [/\b(?:all fields|all disciplines|all areas|any discipline|multidisciplinary journal)\b/i, +10,
    'Claims overly broad scope'],
  [/\b(?:limited time|deadline is approaching|last chance|hurry|act now|do not miss)\b/i, +15,
    'Urgency/pressure language'],
  [/\b(?:invited to review|review (?:this )?manuscript|serve as (?:a )?reviewer|manuscript (?:ID|number|#))\b/i, -30,
    'Peer review invitation signals'],
  [/\b(?:editorial (?:board|committee)|advisory board|associate editor|handling editor|join (?:our|the) (?:board|committee))\b/i, -25,
    'Editorial/advisory board appointment'],
  [/\b(?:ScholarOne|Editorial Manager|Manuscript Central|Open Journal Systems|OJS)\b/i, -20,
    'Sent via known manuscript management system'],
  [/\bISSN[:\s]+\d{4}-\d{3}[\dX]\b/i, -10, 'ISSN provided'],
  [/\bimpact factor\b/i, -5, 'Impact factor mentioned'],
  [/\b(?:please send|attach|submit)\b.{0,40}\b(?:CV|curriculum vitae|photo|headshot)\b/i, +10,
    'Requests CV/photo unprompted'],
  [/\b(?:based on your|in light of your|given your expertise|your work on|your recent publication|we have read)\b/i, -15,
    'Explains why they contacted you specifically'],
];

function extractSenderDomain(text) {
  let m = text.match(/[Ff]rom[:\s]+.+?@([\w.\-]+)/);
  if (m) return m[1].toLowerCase();
  m = text.match(/[\w.\-+]+@([\w.\-]+)/);
  return m ? m[1].toLowerCase() : '';
}

function extractJournalName(text) {
  const patterns = [
    /(?:journal of|journal on|the [\w\s]+ journal)[^,\n.]{0,60}/i,
    /(?:International Journal|European Journal|Asian Journal)[^,\n.]{0,60}/i,
    /(?:Frontiers in|PLOS|Nature [\w]+|Science [\w]+)[^,\n.]{0,60}/i,
  ];
  for (const pat of patterns) {
    const m = text.match(pat);
    if (m) return m[0].trim();
  }
  return '';
}

function domainMatch(text) {
  const lower = text.toLowerCase();
  const matched = DOMAIN_KEYWORDS.filter(kw => lower.includes(kw));
  return { score: Math.min(10, matched.length * 2), keywords: matched };
}

export function classify(emailText) {
  let score = 50;
  const signals = [];
  const lower = emailText.toLowerCase();
  const hasWaiver = /waiv/i.test(emailText);

  for (const [pattern, delta, label] of SIGNALS) {
    if (pattern.test(emailText)) {
      // Cancel APC penalty if fee waiver is also present
      if (delta === +15 && label.includes('fee') && hasWaiver) continue;
      signals.push({ label, delta, isSpam: delta > 0 });
      score += delta;
    }
  }
  score = Math.max(0, Math.min(100, score));

  const { score: domScore, keywords: domKeywords } = domainMatch(emailText);
  score = Math.max(0, Math.min(100, score - Math.min(15, domScore * 2)));

  const senderDomain = extractSenderDomain(emailText);
  const isReputable = [...REPUTABLE_DOMAINS].some(d => senderDomain.endsWith(d));
  const isSuspicious = SUSPICIOUS_DOMAINS.has(senderDomain);

  if (isReputable)  score = Math.max(0, score - 25);
  if (isSuspicious) score = Math.min(100, score + 30);

  // Categorise
  let category;
  if (score >= 70) {
    category = 'spam';
  } else if (score >= 45) {
    category = 'likely_spam';
  } else if (/\b(?:invited to review|review (?:this )?manuscript|serve as (?:a )?reviewer|manuscript (?:ID|number))\b/i.test(emailText)) {
    category = 'reviewer';
  } else if (/\b(?:editorial (?:board|committee)|advisory board|associate editor|join (?:our|the) (?:board|committee))\b/i.test(emailText)) {
    category = 'editor';
  } else {
    category = 'offer';
  }

  const recommendation =
    score >= 70 ? 'ignore' :
    score >= 40 ? 'manual_review' :
    category === 'reviewer' || category === 'editor' ? 'respond' :
    'track_and_consider';

  const freePublicationOffered = hasWaiver && score < 50;

  return {
    score,
    category,
    signals,
    domainScore: domScore,
    domainKeywords: domKeywords,
    senderDomain,
    senderIsReputable: isReputable,
    senderIsSuspicious: isSuspicious,
    journalName: extractJournalName(emailText),
    recommendation,
    freePublicationOffered,
  };
}

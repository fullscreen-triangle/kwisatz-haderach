/**
 * Per-repo derived fields used across multiple charts.
 * Computed once at load time so crossfilter dimensions stay stateless.
 * Ported from transform.ts in zangalewa/zoom-climb.
 */

export function transformIndex(repos) {
  const now = Date.now();
  const fallbackIso = new Date(0).toISOString();

  return repos.map((raw) => {
    const r = {
      full_name:        raw.full_name        ?? '',
      name:             raw.name             ?? raw.full_name ?? '(unknown)',
      description:      raw.description      ?? null,
      language:         raw.language         ?? null,
      topics:           raw.topics           ?? [],
      default_branch:   raw.default_branch   ?? 'main',
      pushed_at:        raw.pushed_at        ?? fallbackIso,
      created_at:       raw.created_at       ?? raw.pushed_at ?? fallbackIso,
      stargazers_count: raw.stargazers_count ?? 0,
      size:             raw.size             ?? 0,
      is_fork:          raw.is_fork          ?? false,
      is_archived:      raw.is_archived      ?? false,
      readme_excerpt:   raw.readme_excerpt   ?? '',
      coord:            raw.coord            ?? { S_k: 0.5, S_t: 0.5, S_e: 0.5 },
      html_url:         raw.html_url         ?? '',
    };

    const pushed_date  = new Date(r.pushed_at);
    const created_date = new Date(r.created_at);
    const dormancy_days = Math.max(0, Math.floor((now - pushed_date.getTime())  / 86400000));
    const age_days      = Math.max(0, Math.floor((now - created_date.getTime()) / 86400000));

    return {
      ...r,
      pushed_date,
      created_date,
      pushed_month:    firstOfMonth(pushed_date),
      pushed_quarter:  firstOfQuarter(pushed_date),
      created_quarter: firstOfQuarter(created_date),
      dormancy_days,
      age_days,
      activity_bucket:     activityBucket(dormancy_days),
      age_bucket:          ageBucket(age_days),
      topic_count:         r.topics.length,
      description_length:  r.description?.length ?? 0,
      readme_length:       r.readme_excerpt.length,
      language_or_none:    r.language ?? '(none)',
      surface_kind:        surfaceKind(r.language),
    };
  });
}

function firstOfMonth(d)   { return new Date(d.getFullYear(), d.getMonth(), 1); }
function firstOfQuarter(d) { const q = Math.floor(d.getMonth() / 3) * 3; return new Date(d.getFullYear(), q, 1); }

function activityBucket(days) {
  if (days < 30)  return 'active';
  if (days < 90)  return 'recent';
  if (days < 365) return 'stale';
  return 'dormant';
}

function ageBucket(days) {
  if (days < 30)  return 'fresh';
  if (days < 180) return '<6mo';
  if (days < 365) return '<1y';
  if (days < 730) return '<2y';
  return 'older';
}

function surfaceKind(language) {
  if (!language) return 'mixed';
  const l = language.toLowerCase();
  if (['tex', 'bibtex'].includes(l))          return 'paper';
  if (['markdown', 'mermaid', 'html'].includes(l)) return 'docs';
  return 'code';
}

export function logSizeBucket(sizeKB) {
  if (sizeKB <= 0) return 0;
  return Math.floor(Math.log10(sizeKB));
}

export function starsBucket(stars) {
  if (stars === 0)  return '0';
  if (stars === 1)  return '1';
  if (stars <= 5)   return '2-5';
  if (stars <= 20)  return '6-20';
  return '21+';
}

export function coordDecile(x) {
  return Math.min(9, Math.max(0, Math.floor(x * 10))) / 10;
}

import type { CardDomainRank, CardSkill } from 'shared-types';

export const SKILL_DOMAINS = {
  C: 'Systems',
  Algorithms: 'Systems',
  Linux: 'Systems',
  'Shell/Bash': 'Systems',
  'Structured programming': 'Systems',
  'Types and data structures': 'Systems',
  'DB & Data': 'Data',
} as const satisfies Record<string, string>;

export const RANK_THRESHOLDS = [
  { minimum: 4000, rank: 'Legendary' },
  { minimum: 2000, rank: 'Veteran' },
  { minimum: 1000, rank: 'Adept' },
  { minimum: 500, rank: 'Apprentice' },
  { minimum: 0, rank: 'Rookie' },
] as const;

type DomainTotals = { total: number; maximum: number };

export function deriveDomainRank(skills: ReadonlyArray<CardSkill>): CardDomainRank {
  const totals = new Map<string, DomainTotals>();

  for (const skill of skills) {
    const domain = SKILL_DOMAINS[skill.name as keyof typeof SKILL_DOMAINS];
    if (!domain || !Number.isFinite(skill.value)) continue;
    const current = totals.get(domain) ?? { total: 0, maximum: 0 };
    current.total += skill.value;
    current.maximum = Math.max(current.maximum, skill.value);
    totals.set(domain, current);
  }

  if (totals.size === 0) return { domain: null, rank: null };

  const [domain, result] = [...totals.entries()].sort((a, b) =>
    b[1].total - a[1].total || b[1].maximum - a[1].maximum || a[0].localeCompare(b[0]),
  )[0];
  const rank = RANK_THRESHOLDS.find((threshold) => result.total >= threshold.minimum)?.rank ?? 'Rookie';
  return { domain, rank };
}

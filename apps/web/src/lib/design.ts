export const TIERS = [
  { index: 1, label: "Initiate", className: "tier-1" },
  { index: 2, label: "Adept", className: "tier-2" },
  { index: 3, label: "Forger", className: "tier-3" },
  { index: 4, label: "Architect", className: "tier-4" },
  { index: 5, label: "Master", className: "tier-5" },
] as const;

export function tierForLevel(level: number) {
  if (level >= 21) return TIERS[4];
  if (level >= 16) return TIERS[3];
  if (level >= 11) return TIERS[2];
  if (level >= 6) return TIERS[1];
  return TIERS[0];
}

export function prestigeStars(expValue: number) {
  const total = Math.max(0, Math.floor(expValue / 1000));
  return { stars: Math.min(total, 5), overflow: Math.max(total - 5, 0) };
}

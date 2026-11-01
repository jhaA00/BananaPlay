export const RANKS = [
  { key: 'new_survivor', label: 'New Survivor', minScore: 0 },
  { key: 'field_explorer', label: 'Field Explorer', minScore: 100 },
  { key: 'resource_hunter', label: 'Resource Hunter', minScore: 300 },
  { key: 'signal_specialist', label: 'Signal Specialist', minScore: 600 },
  { key: 'last_signal_hero', label: 'Last Signal Hero', minScore: 1000 },
];

/**
 * Mirror of the server rank table, used only when a numeric score is available
 * without a rank object (for example another player's leaderboard row).
 */
export function rankForScore(totalScore) {
  const score = Math.max(0, Number(totalScore) || 0);
  let current = RANKS[0];

  for (const rank of RANKS) {
    if (score >= rank.minScore) current = rank;
  }

  const next = RANKS.find((rank) => rank.minScore > score) || null;

  return {
    key: current.key,
    label: current.label,
    minScore: current.minScore,
    nextRank: next ? { label: next.label, minScore: next.minScore } : null,
    pointsToNext: next ? next.minScore - score : 0,
  };
}

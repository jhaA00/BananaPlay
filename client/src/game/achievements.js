/**
 * Presentation mirror of the server achievement catalogue. The server remains
 * the source of truth for which badges a survivor has actually earned; this
 * list only lets the profile show locked badges the player has not unlocked.
 */
export const ACHIEVEMENTS = [
  {
    key: 'first_transmission',
    title: 'First Transmission',
    description: 'Completed the first mission and escaped the shelter.',
    icon: '📡',
  },
  {
    key: 'supply_hunter',
    title: 'Supply Hunter',
    description: 'Raided the ruins and recovered essential supplies.',
    icon: '🎒',
  },
  {
    key: 'power_restored',
    title: 'Power Restored',
    description: 'Brought the district power grid back online.',
    icon: '⚡',
  },
  {
    key: 'network_reconnected',
    title: 'Network Reconnected',
    description: 'Repaired the communications network and found the tower uplink.',
    icon: '📶',
  },
  {
    key: 'last_signal',
    title: 'Last Signal',
    description: 'Completed all five missions and transmitted the Last Signal.',
    icon: '🔆',
  },
  {
    key: 'puzzle_specialist',
    title: 'Puzzle Specialist',
    description: 'Solved ten or more security puzzles.',
    icon: '🧩',
  },
  {
    key: 'perfect_survivor',
    title: 'Perfect Survivor',
    description: 'Completed the game without losing a single life.',
    icon: '🛡️',
  },
];

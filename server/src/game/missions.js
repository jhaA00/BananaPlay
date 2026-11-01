/**
 * The five Last Signal missions. This file is the single source of truth for
 * mission titles, story, objectives, interactive objects and rewards.
 *
 * Puzzle solutions are never stored here. They only ever live in the rounds
 * table and are checked by the backend.
 */

export const MISSIONS = [
  {
    number: 1,
    key: 'shelter',
    title: 'Escape the Shelter',
    location: 'Underground Shelter B-7',
    tagline: 'The lights died. The door sealed.',
    story:
      'You wake in the dark with the taste of stale air and dust. The shelter beneath the city has lost main power, and the blast door is locked from the inside. Somewhere above, a broken world is waiting — but first you have to get out.',
    objectives: [
      'Find the backup power panel and bring the emergency grid online.',
      'Bypass the hydraulic seal on the shelter exit.',
      'Step out into the ruins of the city.',
    ],
    reward: 'Shelter exit opened',
    achievement: 'first_transmission',
    terminals: [
      {
        key: 'backup_power',
        label: 'Backup Power Panel',
        kind: 'panel',
        description:
          'Emergency cells are offline. The panel accepts a numerical cipher to route current into the blast door system.',
      },
      {
        key: 'exit_lock',
        label: 'Shelter Exit Lock',
        kind: 'lock',
        description:
          'A hydraulic seal holds the blast door shut. The locking mechanism is protected by a final security cipher.',
      },
    ],
    flavor: [
      {
        key: 'dead_radio',
        label: 'Dead Radio',
        kind: 'radio',
        text:
          'A weak carrier hiss bleeds through the speaker, then silence. Before it dies you catch a voice repeating coordinates. North. The tower, maybe.',
      },
      {
        key: 'supply_locker',
        label: 'Supply Locker',
        kind: 'locker',
        text:
          'Empty shelves and a single boot print in the dust. Someone left in a hurry — and they took the good batteries.',
      },
    ],
    resources: [],
  },
  {
    number: 2,
    key: 'supply_run',
    title: 'The Supply Run',
    location: 'Ruins of Meridian Market',
    tagline: 'Everything useful has been locked away.',
    story:
      'The city is a skeleton of concrete and rust. Your shelter has enough air to breathe but almost nothing to eat or heal with. Meridian Market is close, and its emergency containers were built to survive a disaster — if you can break their security.',
    objectives: [
      'Reach the ruins of Meridian Market.',
      'Crack the food container and recover supplies.',
      'Open the medical locker and return with essentials.',
    ],
    reward: 'Food, medicine and batteries secured',
    achievement: 'supply_hunter',
    terminals: [
      {
        key: 'food_container',
        label: 'Food Container',
        kind: 'container',
        description:
          'A reinforced ration container with an electronic seal. The keypad is still faintly glowing after all these years.',
      },
      {
        key: 'medical_locker',
        label: 'Medical Locker',
        kind: 'locker',
        description:
          'A medical locker marked with a faded red cross. The lock will not open without the correct decryption sequence.',
      },
    ],
    flavor: [
      {
        key: 'overturned_bus',
        label: 'Overturned Bus',
        kind: 'wreck',
        text:
          'The bus lies on its side like a fallen animal. The route map inside is faded, but someone has circled the power station in red marker.',
      },
      {
        key: 'notice_board',
        label: 'Notice Board',
        kind: 'board',
        text:
          'A hand-written notice flaps in the wind: "DO NOT USE THE MAIN GRID. THE SURGE WILL FRY THE CONTROLS. USE THE SUBSTATION."',
      },
    ],
    resources: [
      { key: 'food', label: 'Food', quantity: 3 },
      { key: 'medicine', label: 'Medicine', quantity: 2 },
      { key: 'batteries', label: 'Batteries', quantity: 4 },
    ],
  },
  {
    number: 3,
    key: 'power_station',
    title: 'Restore the Power',
    location: 'Substation 04',
    tagline: 'No power. No communications. No help.',
    story:
      'The radio in your shelter was picking up a signal from the north. To answer it you need power — real power, not the dying cells in the shelter. Substation 04 is intact enough to try, but its generator and grid breaker are locked behind emergency security.',
    objectives: [
      'Reach Substation 04 and assess the damage.',
      'Unlock the generator control panel.',
      'Close the grid breaker and restore the local power supply.',
    ],
    reward: 'Electricity restored',
    achievement: 'power_restored',
    terminals: [
      {
        key: 'generator_control',
        label: 'Generator Control',
        kind: 'panel',
        description:
          'The generator is starved of fuel but mechanically sound. Its control panel refuses input until the security cipher is cleared.',
      },
      {
        key: 'grid_breaker',
        label: 'Grid Breaker',
        kind: 'panel',
        description:
          'A heavy industrial breaker controls the district grid. The actuator is locked behind a verification terminal.',
      },
    ],
    flavor: [
      {
        key: 'turbine',
        label: 'Dormant Turbine',
        kind: 'machine',
        text:
          'The turbine is still. A thin layer of ash coats every blade. If the breaker closes, this old machine might turn again.',
      },
      {
        key: 'maintenance_log',
        label: 'Maintenance Log',
        kind: 'board',
        text:
          'Last entry, 14 years ago: "Generator serviceable. Grid breaker locked. Do not override without authorization. God help us if the network comes back on its own."',
      },
    ],
    resources: [{ key: 'fuel', label: 'Fuel', quantity: 2 }],
  },
  {
    number: 4,
    key: 'network',
    title: 'The Silent Network',
    location: 'Communications Centre',
    tagline: 'The network is not dead. It is hiding.',
    story:
      'Power hums through the old lines again. The communications centre is a cathedral of dead monitors and tangled cable. Somewhere inside, a transmission console is still connected to the northern tower — but the network has been sealed by the same security system that protects everything else.',
    objectives: [
      'Find the communications control room.',
      'Decrypt and repair the transmission console.',
      'Restore the network and locate the tower uplink.',
    ],
    reward: 'Communications network restored',
    achievement: 'network_reconnected',
    terminals: [
      {
        key: 'transmission_console',
        label: 'Transmission Console',
        kind: 'console',
        description:
          'The console is alive but blind. A security layer blocks the uplink until the correct cipher is entered.',
      },
      {
        key: 'network_decoder',
        label: 'Network Decoder',
        kind: 'panel',
        description:
          'A rack of decoding hardware guards the network routing table. The final authentication step is numerical.',
      },
    ],
    flavor: [
      {
        key: 'antenna_array',
        label: 'Antenna Array',
        kind: 'antenna',
        text:
          'Through the shattered window you can see the antenna array. One dish is still pointed north, frozen mid-turn.',
      },
      {
        key: 'operator_desk',
        label: "Operator's Desk",
        kind: 'desk',
        text:
          'A photograph is taped to the desk: a group of technicians, smiling. On the back, one word is written. "LISTEN."',
      },
    ],
    resources: [{ key: 'parts', label: 'Spare Parts', quantity: 2 }],
  },
  {
    number: 5,
    key: 'tower',
    title: 'The Last Signal',
    location: 'Emergency Transmission Tower',
    tagline: 'One signal. One chance.',
    story:
      'The tower rises out of the fog like a needle. This is the last working transmitter in the region, and the only way to tell the outside world that someone is still alive. The tower control room is locked down, and the final authorization system is waiting for you.',
    objectives: [
      'Reach the tower control room.',
      'Activate the emergency transmission equipment.',
      'Clear final authorization and send the Last Signal.',
    ],
    reward: 'The Last Signal transmitted',
    achievement: 'last_signal',
    terminals: [
      {
        key: 'tower_console',
        label: 'Tower Console',
        kind: 'console',
        description:
          'The tower console controls the main transmitter. It will not power the antenna without a verified security cipher.',
      },
      {
        key: 'final_authorization',
        label: 'Final Authorization',
        kind: 'panel',
        description:
          'The last lock in the chain. Final authorization arms the transmitter and opens the channel to the world.',
      },
    ],
    flavor: [
      {
        key: 'beacon',
        label: 'Signal Beacon',
        kind: 'beacon',
        text:
          'The beacon housing is cracked but the lens is intact. If the transmitter fires, this light will be visible for miles.',
      },
      {
        key: 'message_log',
        label: 'Message Log',
        kind: 'board',
        text:
          'The final log entry is short: "If anyone is listening — we are still here. Tower is operational. Repeat: we are still here."',
      },
    ],
    resources: [],
  },
];

export const MISSION_COUNT = MISSIONS.length;
export const TERMINALS_PER_MISSION = 2;
export const PUZZLE_SECONDS = 45;

export const RESOURCE_LABELS = {
  food: 'Food',
  medicine: 'Medicine',
  batteries: 'Batteries',
  fuel: 'Fuel',
  parts: 'Spare Parts',
};

const MISSION_BY_NUMBER = new Map(MISSIONS.map((mission) => [mission.number, mission]));

export function getMission(number) {
  return MISSION_BY_NUMBER.get(Number(number)) || null;
}

export function getTerminal(missionNumber, objectiveKey) {
  const mission = getMission(missionNumber);
  if (!mission) return null;
  return mission.terminals.find((terminal) => terminal.key === objectiveKey) || null;
}

export function isTerminalKey(missionNumber, objectiveKey) {
  return Boolean(getTerminal(missionNumber, objectiveKey));
}

/**
 * Mission metadata that is safe to send to the browser. It contains no puzzle
 * solutions and no hidden progression state.
 */
export function missionCatalog() {
  return MISSIONS.map((mission) => ({
    number: mission.number,
    key: mission.key,
    title: mission.title,
    location: mission.location,
    tagline: mission.tagline,
    story: mission.story,
    objectives: mission.objectives,
    reward: mission.reward,
    achievement: mission.achievement,
    terminals: mission.terminals.map((terminal) => ({
      key: terminal.key,
      label: terminal.label,
      kind: terminal.kind,
      description: terminal.description,
    })),
    flavor: mission.flavor.map((object) => ({
      key: object.key,
      label: object.label,
      kind: object.kind,
      text: object.text,
    })),
    resources: mission.resources,
  }));
}

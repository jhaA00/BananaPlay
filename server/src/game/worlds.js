/**
 * Authoritative world definitions for The Last Signal.
 *
 * This file is server-only. It contains level geometry, interaction rules,
 * objective prerequisites and item requirements. The browser receives a
 * sanitised copy through GET /api/game/missions/:n/world.
 *
 * No puzzle solution is ever stored here. Terminals reference the matching
 * entry in missions.js and are created through the existing round service.
 */

import { getMission } from './missions.js';

const AREA_WIDTH = 1120;
const AREA_HEIGHT = 630;
const DEFAULT_RADIUS = 86;

const wall = (x, y, w, h, kind = 'wall') => ({ x, y, w, h, kind });
const prop = (x, y, w, h, kind, label = '') => ({ x, y, w, h, kind, label });
const door = (key, areaKey, x, y, label, toArea, spawn, requiresObjectives = [], lockedLabel = '') => ({
  key,
  areaKey,
  label,
  kind: 'door',
  x,
  y,
  w: 44,
  h: 104,
  interactRadius: 92,
  action: 'transition',
  toArea,
  spawn,
  requiresObjectives,
  lockedLabel: lockedLabel || 'The way is sealed.',
  text: label,
});

export const WORLDS = {
  1: {
    key: 'shelter',
    theme: 'shelter',
    areas: [
      {
        key: 'dormitory',
        label: 'Shelter dormitory',
        subtitle: 'Bunk 07 — emergency lighting only',
        width: AREA_WIDTH,
        height: AREA_HEIGHT,
        spawn: { x: 150, y: 330 },
        walls: [
          wall(70, 70, 240, 58, 'bunk'),
          wall(70, 500, 240, 58, 'bunk'),
          wall(450, 80, 54, 170),
          wall(450, 460, 54, 90),
          wall(760, 80, 54, 150),
          wall(840, 470, 190, 54, 'crate'),
        ],
        props: [
          prop(380, 520, 110, 44, 'crate'),
          prop(980, 90, 80, 50, 'lamp'),
          prop(600, 180, 90, 36, 'desk'),
        ],
      },
      {
        key: 'corridor',
        label: 'Service corridor',
        subtitle: 'The main lights are dead',
        width: AREA_WIDTH,
        height: AREA_HEIGHT,
        spawn: { x: 110, y: 315 },
        walls: [
          wall(300, 70, 70, 165, 'pipe'),
          wall(300, 395, 70, 165, 'pipe'),
          wall(650, 120, 130, 58, 'pipe'),
          wall(650, 452, 130, 58, 'pipe'),
          wall(520, 290, 90, 50, 'crate'),
        ],
        props: [
          prop(180, 90, 60, 42, 'lamp'),
          prop(860, 100, 110, 38, 'pipe'),
          prop(880, 500, 130, 38, 'pipe'),
        ],
      },
      {
        key: 'power_room',
        label: 'Backup power room',
        subtitle: 'Auxiliary cells and the blast-door seal',
        width: AREA_WIDTH,
        height: AREA_HEIGHT,
        spawn: { x: 105, y: 315 },
        walls: [
          wall(360, 150, 210, 120, 'machine'),
          wall(380, 470, 150, 70, 'machine'),
          wall(760, 90, 60, 150, 'pipe'),
          wall(760, 430, 60, 110, 'pipe'),
        ],
        props: [
          prop(610, 80, 80, 40, 'lamp'),
          prop(840, 500, 160, 60, 'turbine'),
          prop(180, 100, 100, 40, 'pipe'),
        ],
      },
      {
        key: 'airlock',
        label: 'Surface airlock',
        subtitle: 'Daylight behind the last door',
        width: AREA_WIDTH,
        height: AREA_HEIGHT,
        spawn: { x: 110, y: 315 },
        walls: [
          wall(300, 100, 60, 160, 'pipe'),
          wall(300, 380, 60, 160, 'pipe'),
          wall(640, 230, 120, 170, 'crate'),
        ],
        props: [
          prop(480, 100, 90, 42, 'lamp'),
          prop(860, 90, 80, 50, 'hatch'),
        ],
      },
    ],
    objectives: [
      { key: 'find_flashlight', label: 'Find the emergency flashlight', description: 'Search the dormitory for a working light.' },
      { key: 'read_log', label: 'Read the maintenance log', description: 'Learn what happened to the shelter power.' },
      { key: 'restore_power', label: 'Restore backup power', requires: ['find_flashlight'], description: 'Bring the auxiliary cells online.' },
      { key: 'unlock_exit', label: 'Unlock the blast door', requires: ['restore_power'], description: 'Bypass the hydraulic seal.' },
      { key: 'escape_shelter', label: 'Leave the shelter', requires: ['find_flashlight', 'read_log', 'restore_power', 'unlock_exit'], description: 'Reach the surface hatch.' },
    ],
    objects: [
      { key: 'flashlight', areaKey: 'dormitory', label: 'Emergency flashlight', kind: 'pickup', x: 300, y: 330, w: 46, h: 46, objectiveKey: 'find_flashlight', pickup: [{ key: 'flashlight', label: 'Flashlight', quantity: 1 }], text: 'A heavy rubber flashlight. The battery gauge still shows a weak green pulse.' },
      { key: 'maintenance_log', areaKey: 'dormitory', label: 'Maintenance log', kind: 'note', x: 620, y: 330, w: 42, h: 50, objectiveKey: 'read_log', text: 'Last entry: "Auxiliary cells drained. Blast door seal locked. If the grid comes back, route current through the backup panel first. Do not force the hydraulic line."' },
      { key: 'dead_radio', areaKey: 'dormitory', label: 'Dead radio', kind: 'radio', x: 900, y: 260, w: 56, h: 48, text: 'A weak carrier hiss bleeds through the speaker, then silence. Before it dies you catch a voice repeating coordinates. North. The tower, maybe.' },
      { key: 'supply_locker', areaKey: 'dormitory', label: 'Supply locker', kind: 'locker', x: 900, y: 430, w: 54, h: 62, text: 'Empty shelves and a single boot print in the dust. Someone left in a hurry — and they took the good batteries.' },
      door('to_corridor', 'dormitory', 1052, 315, 'Corridor hatch', 'corridor', { x: 110, y: 315 }),

      door('back_to_dormitory', 'corridor', 68, 315, 'Dormitory hatch', 'dormitory', { x: 980, y: 315 }),
      { key: 'corridor_radio', areaKey: 'corridor', label: 'Wall intercom', kind: 'radio', x: 200, y: 315, w: 46, h: 42, text: 'The intercom is dead, but the label beneath it reads: "POWER ROOM — AUTHORISED PERSONNEL ONLY."' },
      { key: 'pipe_note', areaKey: 'corridor', label: 'Pipe warning', kind: 'note', x: 820, y: 315, w: 40, h: 46, text: 'A stencilled warning: "HYDRAULIC LINE PRESSURISED. CUT ONLY AFTER AUXILIARY POWER IS RESTORED."' },
      door('to_power_room', 'corridor', 1052, 315, 'Power room hatch', 'power_room', { x: 110, y: 315 }, ['find_flashlight'], 'Pitch black. Find a light source before going further.'),

      door('back_to_corridor', 'power_room', 68, 315, 'Corridor hatch', 'corridor', { x: 980, y: 315 }),
      { key: 'backup_power', areaKey: 'power_room', label: 'Backup Power Panel', kind: 'panel', x: 300, y: 330, w: 58, h: 70, requiresObjectives: ['find_flashlight'], objectiveKey: 'restore_power', text: 'Emergency cells are offline. The panel accepts a numerical cipher to route current into the blast door system.' },
      { key: 'exit_lock', areaKey: 'power_room', label: 'Shelter Exit Lock', kind: 'lock', x: 680, y: 300, w: 62, h: 72, requiresObjectives: ['restore_power'], objectiveKey: 'unlock_exit', text: 'A hydraulic seal holds the blast door shut. The locking mechanism is protected by a final security cipher.' },
      { key: 'turbine', areaKey: 'power_room', label: 'Dormant turbine', kind: 'machine', x: 900, y: 530, w: 80, h: 56, text: 'The turbine is still. A thin layer of ash coats every blade. If power returns, this old machine might turn again.' },
      door('to_airlock', 'power_room', 1052, 315, 'Blast door', 'airlock', { x: 110, y: 315 }, ['restore_power', 'unlock_exit'], 'Blast door sealed. Restore power and release the hydraulic seal.'),

      door('back_to_power_room', 'airlock', 68, 315, 'Power room hatch', 'power_room', { x: 980, y: 315 }),
      { key: 'beacon', areaKey: 'airlock', label: 'Signal beacon', kind: 'beacon', x: 520, y: 315, w: 54, h: 62, text: 'The beacon housing is cracked but the lens is intact. There is still a world outside.' },
      { key: 'shelter_exit', areaKey: 'airlock', label: 'Surface hatch', kind: 'exit', x: 1010, y: 315, w: 58, h: 106, action: 'exit', objectiveKey: 'escape_shelter', requiresObjectives: ['find_flashlight', 'read_log', 'restore_power', 'unlock_exit'], text: 'Cold air leaks around the hatch. Beyond it: the ruins.' },
    ],
  },

  2: {
    key: 'supply_run',
    theme: 'city',
    areas: [
      {
        key: 'street',
        label: 'Meridian street',
        subtitle: 'Wind, ash and an overturned bus',
        width: AREA_WIDTH,
        height: AREA_HEIGHT,
        spawn: { x: 120, y: 330 },
        walls: [
          wall(300, 70, 84, 190, 'debris'),
          wall(500, 430, 150, 80, 'debris'),
          wall(720, 80, 120, 150, 'debris'),
          wall(880, 420, 80, 120, 'debris'),
        ],
        props: [
          prop(220, 90, 100, 50, 'rubble'),
          prop(680, 520, 180, 50, 'rubble'),
          prop(960, 90, 60, 42, 'lamp'),
        ],
      },
      {
        key: 'market',
        label: 'Market storage',
        subtitle: 'Emergency containers behind the old shelves',
        width: AREA_WIDTH,
        height: AREA_HEIGHT,
        spawn: { x: 110, y: 315 },
        walls: [
          wall(270, 80, 58, 190, 'shelf'),
          wall(270, 360, 58, 190, 'shelf'),
          wall(590, 80, 58, 190, 'shelf'),
          wall(590, 360, 58, 190, 'shelf'),
          wall(820, 250, 100, 130, 'crate'),
        ],
        props: [
          prop(160, 510, 70, 40, 'crate'),
          prop(760, 90, 100, 40, 'lamp'),
          prop(460, 90, 80, 42, 'sign'),
        ],
      },
      {
        key: 'extraction',
        label: 'Extraction point',
        subtitle: 'Back to the shelter before dark',
        width: AREA_WIDTH,
        height: AREA_HEIGHT,
        spawn: { x: 110, y: 315 },
        walls: [
          wall(300, 100, 70, 170, 'debris'),
          wall(300, 380, 70, 150, 'debris'),
          wall(620, 220, 140, 170, 'crate'),
        ],
        props: [
          prop(470, 100, 90, 40, 'lamp'),
          prop(900, 100, 80, 46, 'sign'),
        ],
      },
    ],
    objectives: [
      { key: 'inspect_bus', label: 'Inspect the overturned bus', description: 'Look for a route map or a clue to the storage area.' },
      { key: 'read_notice', label: 'Read the market notice', description: 'Find out which container holds the medical supplies.' },
      { key: 'open_food', label: 'Crack the food container', requires: ['inspect_bus'], description: 'Bypass the container security seal.' },
      { key: 'collect_food', label: 'Collect the food supplies', requires: ['open_food'], description: 'Take the ration packs.' },
      { key: 'open_medical', label: 'Open the medical locker', requires: ['read_notice'], description: 'Bypass the medical locker cipher.' },
      { key: 'collect_medicine', label: 'Collect medicine and batteries', requires: ['open_medical'], description: 'Take the medical kit and power cells.' },
      { key: 'reach_extraction', label: 'Reach the extraction point', requires: ['collect_food', 'collect_medicine'], description: 'Return to the shelter with the supplies.' },
    ],
    objects: [
      { key: 'overturned_bus', areaKey: 'street', label: 'Overturned bus', kind: 'bus', x: 430, y: 315, w: 110, h: 66, objectiveKey: 'inspect_bus', text: 'The bus lies on its side like a fallen animal. The route map inside is faded, but someone has circled the power station in red marker. A storage tag points toward the market.' },
      { key: 'notice_board', areaKey: 'street', label: 'Notice board', kind: 'board', x: 820, y: 300, w: 52, h: 58, objectiveKey: 'read_notice', text: 'A hand-written notice flaps in the wind: "MEDICAL LOCKER IS IN THE BACK OF THE MARKET. FOOD CONTAINER IS BESIDE THE OLD FREEZERS. DO NOT USE THE MAIN GRID."' },
      { key: 'street_debris', areaKey: 'street', label: 'Collapsed awning', kind: 'debris', x: 620, y: 520, w: 70, h: 44, text: 'A collapsed shop awning. Nothing useful underneath except broken glass and rain.' },
      door('to_market', 'street', 1052, 315, 'Market entrance', 'market', { x: 110, y: 315 }),

      door('back_to_street', 'market', 68, 315, 'Street entrance', 'street', { x: 980, y: 315 }),
      { key: 'food_container', areaKey: 'market', label: 'Food Container', kind: 'container', x: 430, y: 315, w: 68, h: 64, requiresObjectives: ['inspect_bus'], objectiveKey: 'open_food', postSolve: 'unlocked', pickup: [{ key: 'food', label: 'Food', quantity: 3 }], pickupObjective: 'collect_food', text: 'A reinforced ration container with an electronic seal. The keypad is still faintly glowing after all these years.' },
      { key: 'medical_locker', areaKey: 'market', label: 'Medical Locker', kind: 'locker', x: 730, y: 315, w: 60, h: 70, requiresObjectives: ['read_notice'], objectiveKey: 'open_medical', postSolve: 'unlocked', pickup: [{ key: 'medicine', label: 'Medicine', quantity: 2 }, { key: 'batteries', label: 'Batteries', quantity: 4 }], pickupObjective: 'collect_medicine', text: 'A medical locker marked with a faded red cross. The lock will not open without the correct decryption sequence.' },
      { key: 'looted_shelves', areaKey: 'market', label: 'Looted shelves', kind: 'shelf', x: 860, y: 470, w: 70, h: 54, text: 'The shelves have been stripped clean. A child\'s shoe sits alone in the dust.' },
      door('to_extraction', 'market', 1052, 315, 'Extraction route', 'extraction', { x: 110, y: 315 }, ['collect_food', 'collect_medicine'], 'The route is not safe yet. Collect the food and medical supplies first.'),

      door('back_to_market', 'extraction', 68, 315, 'Market entrance', 'market', { x: 980, y: 315 }),
      { key: 'extraction_point', areaKey: 'extraction', label: 'Shelter approach', kind: 'exit', x: 1010, y: 315, w: 58, h: 106, action: 'exit', objectiveKey: 'reach_extraction', requiresObjectives: ['inspect_bus', 'read_notice', 'collect_food', 'collect_medicine'], text: 'The shelter hatch is just ahead. The supplies are heavy, but you made it.' },
    ],
  },

  3: {
    key: 'power_station',
    theme: 'substation',
    areas: [
      {
        key: 'gate',
        label: 'Substation gate',
        subtitle: 'Ash on the high-voltage warnings',
        width: AREA_WIDTH,
        height: AREA_HEIGHT,
        spawn: { x: 120, y: 315 },
        walls: [
          wall(280, 80, 70, 180, 'fence'),
          wall(280, 380, 70, 170, 'fence'),
          wall(760, 110, 80, 150, 'machine'),
          wall(760, 410, 80, 120, 'machine'),
        ],
        props: [
          prop(500, 90, 90, 40, 'lamp'),
          prop(940, 500, 100, 50, 'sign'),
        ],
      },
      {
        key: 'turbine_hall',
        label: 'Turbine hall',
        subtitle: 'Cold machinery and a fuel store',
        width: AREA_WIDTH,
        height: AREA_HEIGHT,
        spawn: { x: 110, y: 315 },
        walls: [
          wall(360, 110, 210, 150, 'turbine'),
          wall(360, 400, 210, 110, 'machine'),
          wall(760, 90, 60, 170, 'pipe'),
          wall(760, 400, 60, 160, 'pipe'),
        ],
        props: [
          prop(170, 100, 80, 42, 'lamp'),
          prop(600, 520, 160, 50, 'crate'),
        ],
      },
      {
        key: 'generator_room',
        label: 'Generator room',
        subtitle: 'One generator. One breaker. One chance.',
        width: AREA_WIDTH,
        height: AREA_HEIGHT,
        spawn: { x: 105, y: 315 },
        walls: [
          wall(330, 160, 160, 130, 'machine'),
          wall(330, 430, 160, 80, 'machine'),
          wall(690, 80, 60, 170, 'pipe'),
          wall(690, 430, 60, 110, 'pipe'),
        ],
        props: [
          prop(180, 90, 80, 42, 'lamp'),
          prop(860, 500, 140, 60, 'turbine'),
        ],
      },
    ],
    objectives: [
      { key: 'read_log', label: 'Read the maintenance log', description: 'Understand why the grid was taken offline.' },
      { key: 'find_fuel', label: 'Find a fuel canister', description: 'The generator will not start dry.' },
      { key: 'refuel_generator', label: 'Refuel the generator', requires: ['find_fuel'], description: 'Prepare the generator for a controlled start.' },
      { key: 'restore_generator', label: 'Unlock the generator controls', requires: ['refuel_generator'], description: 'Clear the security cipher on the control panel.' },
      { key: 'power_restored', label: 'Close the grid breaker', requires: ['restore_generator'], description: 'Send power back into the district grid.' },
      { key: 'leave_substation', label: 'Leave Substation 04', requires: ['read_log', 'find_fuel', 'refuel_generator', 'restore_generator', 'power_restored'], description: 'The communications centre is waiting.' },
    ],
    objects: [
      { key: 'maintenance_log', areaKey: 'gate', label: 'Maintenance log', kind: 'board', x: 450, y: 315, w: 50, h: 58, objectiveKey: 'read_log', text: 'Last entry, 14 years ago: "Generator serviceable. Grid breaker locked. Do not override without authorization. God help us if the network comes back on its own."' },
      { key: 'gate_warning', areaKey: 'gate', label: 'High-voltage warning', kind: 'sign', x: 780, y: 315, w: 48, h: 54, text: 'A faded warning: "SUBSTATION 04 — LIVE GRID. UNAUTHORISED ENTRY IS FATAL."' },
      door('to_turbine', 'gate', 1052, 315, 'Turbine hall door', 'turbine_hall', { x: 110, y: 315 }),

      door('back_to_gate', 'turbine_hall', 68, 315, 'Substation gate', 'gate', { x: 980, y: 315 }),
      { key: 'fuel_canister', areaKey: 'turbine_hall', label: 'Fuel canister', kind: 'pickup', x: 620, y: 315, w: 48, h: 54, objectiveKey: 'find_fuel', pickup: [{ key: 'fuel', label: 'Fuel', quantity: 2 }], text: 'A sealed canister with a faded hazard label. It is heavier than it looks.' },
      { key: 'turbine', areaKey: 'turbine_hall', label: 'Dormant turbine', kind: 'turbine', x: 460, y: 315, w: 100, h: 70, text: 'The turbine is still. A thin layer of ash coats every blade. If the breaker closes, this old machine might turn again.' },
      { key: 'fuel_store_note', areaKey: 'turbine_hall', label: 'Fuel store manifest', kind: 'note', x: 850, y: 250, w: 42, h: 48, text: 'A clipboard lists fuel deliveries. The last line is circled: "ONE CANISTER LEFT. GENERATOR PRIMED. DO NOT RUN DRY."' },
      door('to_generator', 'turbine_hall', 1052, 315, 'Generator room door', 'generator_room', { x: 110, y: 315 }, ['find_fuel'], 'The generator room is sealed until you find fuel.'),

      door('back_to_turbine', 'generator_room', 68, 315, 'Turbine hall door', 'turbine_hall', { x: 980, y: 315 }),
      { key: 'generator', areaKey: 'generator_room', label: 'Generator', kind: 'machine', x: 520, y: 315, w: 100, h: 86, action: 'refuel', requiresItem: { key: 'fuel', label: 'Fuel', quantity: 1 }, objectiveKey: 'refuel_generator', text: 'The generator is starved of fuel but mechanically sound. It needs a canister before the control panel will respond.' },
      { key: 'generator_control', areaKey: 'generator_room', label: 'Generator Control', kind: 'panel', x: 700, y: 220, w: 58, h: 72, requiresObjectives: ['refuel_generator'], objectiveKey: 'restore_generator', text: 'The generator control panel refuses input until the security cipher is cleared.' },
      { key: 'grid_breaker', areaKey: 'generator_room', label: 'Grid Breaker', kind: 'panel', x: 900, y: 315, w: 64, h: 78, requiresObjectives: ['restore_generator'], objectiveKey: 'power_restored', text: 'A heavy industrial breaker controls the district grid. The actuator is locked behind a verification terminal.' },
      { key: 'leave_substation', areaKey: 'generator_room', label: 'Substation exit', kind: 'exit', x: 1020, y: 500, w: 58, h: 100, action: 'exit', objectiveKey: 'leave_substation', requiresObjectives: ['read_log', 'find_fuel', 'refuel_generator', 'restore_generator', 'power_restored'], text: 'The grid hums behind you. The communications centre is next.' },
    ],
  },

  4: {
    key: 'network',
    theme: 'comms',
    areas: [
      {
        key: 'lobby',
        label: 'Communications lobby',
        subtitle: 'Dead monitors and old photographs',
        width: AREA_WIDTH,
        height: AREA_HEIGHT,
        spawn: { x: 120, y: 315 },
        walls: [
          wall(280, 90, 70, 170, 'desk'),
          wall(280, 380, 70, 160, 'desk'),
          wall(720, 100, 130, 80, 'rack'),
          wall(720, 450, 130, 80, 'rack'),
        ],
        props: [
          prop(470, 90, 90, 42, 'lamp'),
          prop(900, 270, 90, 50, 'sign'),
        ],
      },
      {
        key: 'server_room',
        label: 'Server room',
        subtitle: 'The network is still warm',
        width: AREA_WIDTH,
        height: AREA_HEIGHT,
        spawn: { x: 110, y: 315 },
        walls: [
          wall(280, 80, 64, 190, 'rack'),
          wall(280, 360, 64, 190, 'rack'),
          wall(560, 80, 64, 190, 'rack'),
          wall(560, 360, 64, 190, 'rack'),
          wall(820, 250, 90, 130, 'machine'),
        ],
        props: [
          prop(170, 510, 80, 42, 'crate'),
          prop(760, 90, 80, 42, 'lamp'),
        ],
      },
      {
        key: 'control_room',
        label: 'Control room',
        subtitle: 'The uplink points north',
        width: AREA_WIDTH,
        height: AREA_HEIGHT,
        spawn: { x: 110, y: 315 },
        walls: [
          wall(330, 110, 180, 70, 'console'),
          wall(330, 450, 180, 70, 'console'),
          wall(700, 130, 70, 150, 'rack'),
          wall(700, 350, 70, 150, 'rack'),
        ],
        props: [
          prop(190, 90, 80, 42, 'lamp'),
          prop(900, 500, 120, 50, 'antenna'),
        ],
      },
    ],
    objectives: [
      { key: 'read_note', label: "Read the operator's note", description: 'Find the final instruction left behind.' },
      { key: 'find_parts', label: 'Find spare parts', description: 'The console cannot be repaired without them.' },
      { key: 'repair_network', label: 'Repair the damaged console', requires: ['find_parts'], description: 'Use the spare parts on the network hardware.' },
      { key: 'decode_network', label: 'Decrypt the network decoder', requires: ['repair_network'], description: 'Recover the routing table.' },
      { key: 'activate_console', label: 'Activate the transmission console', requires: ['decode_network'], description: 'Bring the uplink back online.' },
      { key: 'restore_network', label: 'Restore the network', requires: ['decode_network', 'activate_console'], description: 'Send a test pulse to the tower.' },
      { key: 'leave_centre', label: 'Leave the communications centre', requires: ['read_note', 'find_parts', 'repair_network', 'decode_network', 'activate_console', 'restore_network'], description: 'The signal points toward the emergency tower.' },
    ],
    objects: [
      { key: 'operator_desk', areaKey: 'lobby', label: "Operator's Desk", kind: 'desk', x: 430, y: 315, w: 70, h: 60, objectiveKey: 'read_note', text: 'A photograph is taped to the desk: a group of technicians, smiling. On the back, one word is written. "LISTEN." The side drawer holds a maintenance tag for the server room.' },
      { key: 'spare_parts', areaKey: 'lobby', label: 'Spare parts crate', kind: 'pickup', x: 780, y: 220, w: 52, h: 52, objectiveKey: 'find_parts', pickup: [{ key: 'parts', label: 'Spare Parts', quantity: 2 }], text: 'A crate of clean circuit boards and cable connectors. Exactly what a damaged console needs.' },
      { key: 'lobby_photo', areaKey: 'lobby', label: 'Staff photograph', kind: 'note', x: 900, y: 430, w: 42, h: 46, text: 'Someone has scratched out the faces. Beneath the frame, a note: "The tower is the only thing that still answers."' },
      door('to_server', 'lobby', 1052, 315, 'Server room door', 'server_room', { x: 110, y: 315 }),

      door('back_to_lobby', 'server_room', 68, 315, 'Lobby door', 'lobby', { x: 980, y: 315 }),
      { key: 'damaged_console', areaKey: 'server_room', label: 'Damaged console', kind: 'console', x: 420, y: 315, w: 80, h: 66, action: 'repair', requiresItem: { key: 'parts', label: 'Spare Parts', quantity: 1 }, objectiveKey: 'repair_network', text: 'A console with a scorched board and a loose ribbon cable. The spare parts will fit.' },
      { key: 'network_decoder', areaKey: 'server_room', label: 'Network Decoder', kind: 'panel', x: 700, y: 315, w: 62, h: 74, requiresObjectives: ['repair_network'], objectiveKey: 'decode_network', text: 'A rack of decoding hardware guards the network routing table. The final authentication step is numerical.' },
      { key: 'server_rack', areaKey: 'server_room', label: 'Server rack', kind: 'rack', x: 860, y: 480, w: 70, h: 54, text: 'The rack is warm. Somewhere inside, a fan is still turning after all these years.' },
      door('to_control', 'server_room', 1052, 315, 'Control room door', 'control_room', { x: 110, y: 315 }, ['repair_network'], 'The control room is sealed until the network hardware is repaired.'),

      door('back_to_server', 'control_room', 68, 315, 'Server room door', 'server_room', { x: 980, y: 315 }),
      { key: 'transmission_console', areaKey: 'control_room', label: 'Transmission Console', kind: 'console', x: 300, y: 315, w: 78, h: 76, requiresObjectives: ['decode_network'], objectiveKey: 'activate_console', text: 'The console is alive but blind. A security layer blocks the uplink until the correct cipher is entered.' },
      { key: 'network_uplink', areaKey: 'control_room', label: 'Network uplink', kind: 'antenna', x: 600, y: 315, w: 56, h: 94, action: 'activate', requiresObjectives: ['decode_network', 'activate_console'], objectiveKey: 'restore_network', text: 'The uplink dish is frozen mid-turn. A test pulse should unlock the northward route.' },
      { key: 'antenna_array', areaKey: 'control_room', label: 'Antenna Array', kind: 'antenna', x: 860, y: 230, w: 60, h: 86, text: 'Through the shattered window you can see the antenna array. One dish is still pointed north, frozen mid-turn.' },
      { key: 'leave_centre', areaKey: 'control_room', label: 'Tower observation door', kind: 'exit', x: 1020, y: 500, w: 58, h: 100, action: 'exit', objectiveKey: 'leave_centre', requiresObjectives: ['read_note', 'find_parts', 'repair_network', 'decode_network', 'activate_console', 'restore_network'], text: 'The tower is visible through the window. One last climb.' },
    ],
  },

  5: {
    key: 'tower',
    theme: 'tower',
    areas: [
      {
        key: 'tower_gate',
        label: 'Tower approach',
        subtitle: 'The last working transmitter',
        width: AREA_WIDTH,
        height: AREA_HEIGHT,
        spawn: { x: 120, y: 315 },
        walls: [
          wall(280, 80, 70, 180, 'debris'),
          wall(280, 380, 70, 170, 'debris'),
          wall(760, 100, 80, 140, 'machine'),
          wall(760, 420, 80, 110, 'machine'),
        ],
        props: [
          prop(480, 90, 90, 42, 'lamp'),
          prop(940, 500, 80, 46, 'tower'),
        ],
      },
      {
        key: 'control_room',
        label: 'Tower control room',
        subtitle: 'Final authorization waits here',
        width: AREA_WIDTH,
        height: AREA_HEIGHT,
        spawn: { x: 110, y: 315 },
        walls: [
          wall(310, 120, 170, 80, 'console'),
          wall(310, 440, 170, 70, 'console'),
          wall(680, 90, 60, 160, 'rack'),
          wall(680, 390, 60, 160, 'rack'),
        ],
        props: [
          prop(190, 90, 80, 42, 'lamp'),
          prop(880, 500, 120, 50, 'antenna'),
        ],
      },
      {
        key: 'antenna_deck',
        label: 'Antenna deck',
        subtitle: 'One signal. One chance.',
        width: AREA_WIDTH,
        height: AREA_HEIGHT,
        spawn: { x: 110, y: 315 },
        walls: [
          wall(300, 100, 60, 150, 'rig'),
          wall(300, 390, 60, 150, 'rig'),
          wall(660, 250, 130, 120, 'tower'),
        ],
        props: [
          prop(470, 90, 90, 40, 'lamp'),
          prop(920, 90, 70, 50, 'beacon'),
        ],
      },
    ],
    objectives: [
      { key: 'read_log', label: 'Read the tower message log', description: 'Find the final transmission record.' },
      { key: 'collect_equipment', label: 'Recover the emergency equipment', description: 'The transmitter needs the emergency key.' },
      { key: 'activate_transmitter', label: 'Activate the tower transmitter', requires: ['collect_equipment'], description: 'Bring the main transmitter online.' },
      { key: 'authorize_signal', label: 'Clear final authorization', requires: ['activate_transmitter'], description: 'Bypass the last security lock.' },
      { key: 'transmit_signal', label: 'Send the Last Signal', requires: ['read_log', 'collect_equipment', 'activate_transmitter', 'authorize_signal'], description: 'Tell the world someone is still alive.' },
    ],
    objects: [
      { key: 'message_log', areaKey: 'tower_gate', label: 'Message log', kind: 'board', x: 430, y: 315, w: 50, h: 58, objectiveKey: 'read_log', text: 'The final log entry is short: "If anyone is listening — we are still here. Tower is operational. Repeat: we are still here."' },
      { key: 'emergency_equipment', areaKey: 'tower_gate', label: 'Emergency equipment', kind: 'pickup', x: 780, y: 250, w: 52, h: 52, objectiveKey: 'collect_equipment', pickup: [{ key: 'equipment', label: 'Emergency Equipment', quantity: 1 }], text: 'A sealed case containing the transmitter key and a charged emergency cell. This is the last one.' },
      { key: 'tower_plaque', areaKey: 'tower_gate', label: 'Tower plaque', kind: 'sign', x: 940, y: 430, w: 48, h: 54, text: '"EMERGENCY TRANSMISSION TOWER 09 — MAINTAIN SILENCE UNTIL AUTHORISED." Someone has scratched out the last two words.' },
      door('to_control', 'tower_gate', 1052, 315, 'Control room door', 'control_room', { x: 110, y: 315 }, ['collect_equipment'], 'The control room needs the emergency equipment key.'),

      door('back_to_gate', 'control_room', 68, 315, 'Tower approach', 'tower_gate', { x: 980, y: 315 }),
      { key: 'tower_console', areaKey: 'control_room', label: 'Tower Console', kind: 'console', x: 420, y: 315, w: 84, h: 78, requiresObjectives: ['collect_equipment'], objectiveKey: 'activate_transmitter', text: 'The tower console controls the main transmitter. It will not power the antenna without a verified security cipher.' },
      { key: 'final_authorization', areaKey: 'control_room', label: 'Final Authorization', kind: 'panel', x: 700, y: 315, w: 62, h: 78, requiresObjectives: ['activate_transmitter'], objectiveKey: 'authorize_signal', text: 'The last lock in the chain. Final authorization arms the transmitter and opens the channel to the world.' },
      { key: 'control_log', areaKey: 'control_room', label: 'Shift log', kind: 'note', x: 900, y: 480, w: 42, h: 46, text: 'The last shift signed off with a single line: "Antenna aligned north. Waiting for someone to answer."' },
      door('to_antenna', 'control_room', 1052, 315, 'Antenna deck door', 'antenna_deck', { x: 110, y: 315 }, ['activate_transmitter', 'authorize_signal'], 'The deck is sealed until the transmitter is armed and authorised.'),

      door('back_to_control', 'antenna_deck', 68, 315, 'Control room', 'control_room', { x: 980, y: 315 }),
      { key: 'beacon', areaKey: 'antenna_deck', label: 'Signal Beacon', kind: 'beacon', x: 900, y: 315, w: 54, h: 64, text: 'The beacon housing is cracked but the lens is intact. If the transmitter fires, this light will be visible for miles.' },
      { key: 'transmitter', areaKey: 'antenna_deck', label: 'Emergency transmitter', kind: 'transmitter', x: 520, y: 315, w: 76, h: 94, action: 'exit', objectiveKey: 'transmit_signal', requiresObjectives: ['read_log', 'collect_equipment', 'activate_transmitter', 'authorize_signal'], text: 'The transmitter is armed. One final switch and the Last Signal goes out.' },
    ],
  },
};

const TERMINAL_COPY = new Map();
for (const mission of [1, 2, 3, 4, 5]) {
  const definition = getMission(mission);
  for (const terminal of definition?.terminals ?? []) {
    TERMINAL_COPY.set(`${mission}:${terminal.key}`, terminal);
  }
}

function enrichObject(missionNumber, object) {
  const terminal = TERMINAL_COPY.get(`${missionNumber}:${object.key}`);
  if (terminal) {
    return {
      ...object,
      terminal: true,
      label: object.label ?? terminal.label,
      description: terminal.description,
      kind: terminal.kind,
    };
  }
  return object;
}

for (const [number, world] of Object.entries(WORLDS)) {
  world.objects = world.objects
    .filter((object) => object.key && object.areaKey)
    .map((object) => enrichObject(Number(number), object));
  world.objectMap = new Map(world.objects.map((object) => [object.key, object]));
  world.areaMap = new Map(world.areas.map((area) => [area.key, area]));
  world.objectiveMap = new Map(world.objectives.map((objective) => [objective.key, objective]));
}

export function getWorld(missionNumber) {
  return WORLDS[Number(missionNumber)] ?? null;
}

export function getWorldObject(missionNumber, objectKey) {
  return getWorld(missionNumber)?.objectMap.get(objectKey) ?? null;
}

export function getWorldArea(missionNumber, areaKey) {
  return getWorld(missionNumber)?.areaMap.get(areaKey) ?? null;
}

export function getWorldObjectives(missionNumber) {
  return getWorld(missionNumber)?.objectives ?? [];
}

export function getObjective(missionNumber, objectiveKey) {
  return getWorld(missionNumber)?.objectiveMap.get(objectiveKey) ?? null;
}

/** Safe world definition for the browser. */
export function publicWorld(missionNumber) {
  const world = getWorld(missionNumber);
  if (!world) return null;

  return {
    missionNumber: Number(missionNumber),
    key: world.key,
    theme: world.theme,
    areas: world.areas.map((area) => ({
      key: area.key,
      label: area.label,
      subtitle: area.subtitle ?? '',
      width: area.width,
      height: area.height,
      spawn: area.spawn,
      walls: area.walls,
      props: area.props ?? [],
    })),
    objects: world.objects.map((object) => ({
      key: object.key,
      areaKey: object.areaKey,
      label: object.label,
      kind: object.kind,
      x: object.x,
      y: object.y,
      w: object.w ?? 48,
      h: object.h ?? 48,
      interactRadius: object.interactRadius ?? DEFAULT_RADIUS,
      terminal: Boolean(object.terminal),
      action: object.action ?? 'inspect',
      toArea: object.toArea ?? null,
      spawn: object.spawn ?? null,
      objectiveKey: object.objectiveKey ?? null,
      requiresObjectives: object.requiresObjectives ?? [],
      requiresItem: object.requiresItem ?? null,
      lockedLabel: object.lockedLabel ?? '',
      text: object.text ?? '',
      description: object.description ?? '',
      pickup: object.pickup ?? [],
    })),
    objectives: world.objectives.map((objective) => ({
      key: objective.key,
      label: objective.label,
      description: objective.description ?? '',
      requires: objective.requires ?? [],
    })),
  };
}

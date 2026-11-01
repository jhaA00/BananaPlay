/**
 * Visual placement only. Mission rules, puzzle solutions and progression live
 * on the backend. If a key is missing here it is positioned automatically from
 * its index by the scene component.
 */
export const SCENE_OBJECTS = {
  shelter: {
    terminalIcons: { backup_power: '⚡', exit_lock: '⛓️' },
    flavorIcons: { dead_radio: '📻', supply_locker: '🧰' },
    positions: {
      backup_power: { x: 20, y: 56 },
      exit_lock: { x: 78, y: 40 },
      dead_radio: { x: 34, y: 76 },
      supply_locker: { x: 58, y: 74 },
    },
  },
  supply_run: {
    terminalIcons: { food_container: '📦', medical_locker: '🧰' },
    flavorIcons: { overturned_bus: '🚌', notice_board: '📌' },
    positions: {
      food_container: { x: 24, y: 66 },
      medical_locker: { x: 72, y: 60 },
      overturned_bus: { x: 48, y: 78 },
      notice_board: { x: 84, y: 34 },
    },
  },
  power_station: {
    terminalIcons: { generator_control: '🎛️', grid_breaker: '🔌' },
    flavorIcons: { turbine: '⚙️', maintenance_log: '📋' },
    positions: {
      generator_control: { x: 30, y: 58 },
      grid_breaker: { x: 74, y: 52 },
      turbine: { x: 52, y: 76 },
      maintenance_log: { x: 84, y: 30 },
    },
  },
  network: {
    terminalIcons: { transmission_console: '🖥️', network_decoder: '📡' },
    flavorIcons: { antenna_array: '📶', operator_desk: '🗂️' },
    positions: {
      transmission_console: { x: 28, y: 62 },
      network_decoder: { x: 72, y: 54 },
      antenna_array: { x: 50, y: 26 },
      operator_desk: { x: 84, y: 74 },
    },
  },
  tower: {
    terminalIcons: { tower_console: '🎛️', final_authorization: '🔐' },
    flavorIcons: { beacon: '🔆', message_log: '📋' },
    positions: {
      tower_console: { x: 30, y: 64 },
      final_authorization: { x: 70, y: 60 },
      beacon: { x: 50, y: 20 },
      message_log: { x: 84, y: 34 },
    },
  },
};

export function sceneMeta(missionKey) {
  return (
    SCENE_OBJECTS[missionKey] ?? {
      terminalIcons: {},
      flavorIcons: {},
      positions: {},
    }
  );
}

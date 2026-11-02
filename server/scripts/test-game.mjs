/**
 * End-to-end integration test for The Last Signal.
 *
 * Runs against its own API process (default port 4111) and a throwaway user, so
 * it can be executed while the development server is running. Banana API cipher
 * requests are not used: rounds are seeded directly with known solutions so the
 * scoring, timer, achievement and persistence rules can be verified repeatably.
 *
 * Usage:
 *   npm run test:integration -w server
 *   TEST_PORT=4120 npm run test:integration -w server
 */
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { config } from '../src/config.js';

const PORT = Number(process.env.TEST_PORT) || 4111;
const BASE = `http://localhost:${PORT}/api`;
const SERVER_DIR = fileURLToPath(new URL('../', import.meta.url));

let passed = 0;
let failed = 0;

function check(label, condition, detail = '') {
  if (condition) {
    passed += 1;
    console.log(`PASS  ${label}`);
    return;
  }

  failed += 1;
  console.log(`FAIL  ${label}${detail ? ` :: ${detail}` : ''}`);
}

function section(title) {
  console.log(`\n— ${title} —`);
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function startServer() {
  const child = spawn(process.execPath, ['src/index.js'], {
    cwd: SERVER_DIR,
    env: { ...process.env, PORT: String(PORT), NODE_ENV: 'test' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  let output = '';
  child.stdout.on('data', (chunk) => {
    output += chunk;
  });
  child.stderr.on('data', (chunk) => {
    output += chunk;
  });

  for (let attempt = 0; attempt < 60; attempt += 1) {
    if (child.exitCode !== null) {
      throw new Error(`API process exited during startup:\n${output}`);
    }
    try {
      const response = await fetch(`${BASE}/health`);
      if (response.ok) return child;
    } catch {
      // Server is still starting.
    }
    await wait(250);
  }

  child.kill('SIGKILL');
  throw new Error(`API did not become ready on port ${PORT}:\n${output}`);
}

async function stopServer(child) {
  if (!child || child.exitCode !== null) return;
  const exited = new Promise((resolve) => child.once('exit', resolve));
  child.kill('SIGTERM');
  await Promise.race([exited, wait(5000)]);
  if (child.exitCode === null) child.kill('SIGKILL');
}

const db = new pg.Client({ connectionString: config.databaseUrl });
const username = `it_${Date.now().toString(36)}${Math.floor(Math.random() * 90 + 10)}`.slice(0, 20);
let token = null;
let userId = null;
let server = null;

async function api(path, { method = 'GET', body, auth = true } = {}) {
  const headers = {};
  if (body !== undefined) headers['content-type'] = 'application/json';
  if (auth && token) headers.authorization = `Bearer ${token}`;

  const response = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  return { status: response.status, data };
}

async function activeGameId() {
  const { rows } = await db.query(
    `SELECT id FROM games WHERE user_id = $1 AND status = 'active' ORDER BY id DESC LIMIT 1`,
    [userId],
  );
  assert.ok(rows[0], 'expected an active game');
  return rows[0].id;
}

async function seedRound({ missionNumber, objectiveKey, solution, expired = false, hint = false }) {
  const gameId = await activeGameId();
  const { rows } = await db.query(
    `INSERT INTO rounds
       (game_id, question_url, solution, expires_at, mission_number, objective_key, hint_used)
     VALUES ($1, 'https://example.test/cipher.png', $2, now() + $3::interval, $4, $5, $6)
     RETURNING id`,
    [
      gameId,
      solution,
      expired ? '-1 minute' : '45 seconds',
      missionNumber,
      objectiveKey,
      hint,
    ],
  );
  return rows[0].id;
}

async function solveRound({ missionNumber, objectiveKey, solution, hint = false }) {
  const roundId = await seedRound({ missionNumber, objectiveKey, solution, hint });

  if (hint) {
    const hinted = await api('/game/hint', { method: 'POST', body: { roundId } });
    assert.equal(hinted.status, 200, `hint failed: ${JSON.stringify(hinted.data)}`);
    assert.equal(hinted.data.round.hintUsed, true);
  }

  return api('/game/answer', { method: 'POST', body: { roundId, answer: solution } });
}

// Each mission is played through the real world endpoints. Terminal ciphers are
// seeded so this suite never depends on the live Banana API.
const WORLD_PLANS = {
  1: [
    ['dormitory', 'flashlight', 300, 330, 'interact'],
    ['dormitory', 'maintenance_log', 620, 330, 'interact'],
    ['dormitory', 'to_corridor', 1052, 315, 'interact'],
    ['corridor', 'to_power_room', 1052, 315, 'interact'],
    ['power_room', 'exit_lock', 680, 300, 'expect409'],
    ['power_room', 'backup_power', 300, 330, 'terminal'],
    ['power_room', 'exit_lock', 680, 300, 'terminal'],
    ['power_room', 'to_airlock', 1052, 315, 'interact'],
    ['airlock', 'shelter_exit', 1010, 315, 'exit'],
  ],
  2: [
    ['street', 'overturned_bus', 430, 315, 'interact'],
    ['street', 'notice_board', 820, 300, 'interact'],
    ['street', 'to_market', 1052, 315, 'interact'],
    ['market', 'food_container', 430, 315, 'terminal+pickup'],
    ['market', 'medical_locker', 730, 315, 'terminal+pickup'],
    ['market', 'to_extraction', 1052, 315, 'interact'],
    ['extraction', 'extraction_point', 1010, 315, 'exit'],
  ],
  3: [
    ['gate', 'maintenance_log', 450, 315, 'interact'],
    ['gate', 'to_turbine', 1052, 315, 'interact'],
    ['turbine_hall', 'to_generator', 1052, 315, 'expect409'],
    ['turbine_hall', 'fuel_canister', 620, 315, 'interact'],
    ['turbine_hall', 'to_generator', 1052, 315, 'interact'],
    ['generator_room', 'generator_control', 700, 220, 'expect409'],
    ['generator_room', 'generator', 520, 315, 'interact'],
    ['generator_room', 'generator_control', 700, 220, 'terminal'],
    ['generator_room', 'grid_breaker', 900, 315, 'terminal'],
    ['generator_room', 'leave_substation', 1020, 500, 'exit'],
  ],
  4: [
    ['lobby', 'operator_desk', 430, 315, 'interact'],
    ['lobby', 'to_server', 1052, 315, 'interact'],
    ['server_room', 'damaged_console', 420, 315, 'expect409'],
    ['server_room', 'back_to_lobby', 68, 315, 'interact'],
    ['lobby', 'spare_parts', 780, 220, 'interact'],
    ['lobby', 'to_server', 1052, 315, 'interact'],
    ['server_room', 'damaged_console', 420, 315, 'interact'],
    ['server_room', 'network_decoder', 700, 315, 'terminal'],
    ['server_room', 'to_control', 1052, 315, 'interact'],
    ['control_room', 'transmission_console', 300, 315, 'terminal'],
    ['control_room', 'network_uplink', 600, 315, 'interact'],
    ['control_room', 'leave_centre', 1020, 500, 'exit'],
  ],
  5: [
    ['tower_gate', 'message_log', 430, 315, 'interact'],
    ['tower_gate', 'to_control', 1052, 315, 'expect409'],
    ['tower_gate', 'emergency_equipment', 780, 250, 'interact'],
    ['tower_gate', 'to_control', 1052, 315, 'interact'],
    ['control_room', 'tower_console', 420, 315, 'terminal'],
    ['control_room', 'final_authorization', 700, 315, 'terminal'],
    ['control_room', 'to_antenna', 1052, 315, 'interact'],
    ['antenna_deck', 'transmitter', 520, 315, 'exit'],
  ],
};

async function runMission(missionNumber, terminals) {
  const started = await api(`/game/missions/${missionNumber}/start`, { method: 'POST' });
  assert.equal(started.status, 200, `mission ${missionNumber} start failed`);

  const loaded = await api(`/game/missions/${missionNumber}/world`);
  assert.equal(loaded.status, 200, `mission ${missionNumber} world failed`);
  let area = loaded.data.world.state.areaKey;
  let last = null;

  for (const step of WORLD_PLANS[missionNumber]) {
    const [stepArea, objectKey, x, y, type] = step;
    const moved = await api('/game/world/position', {
      method: 'POST',
      body: { missionNumber, areaKey: area, x, y, facing: 'down' },
    });
    assert.equal(moved.status, 200, `move to ${objectKey} failed`);

    if (type === 'terminal') {
      last = await solveRound({
        missionNumber,
        objectiveKey: objectKey,
        solution: terminals[objectKey],
        hint: terminals[`${objectKey}_hint`] === true,
      });
      assert.equal(last.status, 200, `terminal ${objectKey} failed`);
      continue;
    }

    if (type === 'terminal+pickup') {
      const solved = await solveRound({
        missionNumber,
        objectiveKey: objectKey,
        solution: terminals[objectKey],
      });
      assert.equal(solved.status, 200, `terminal ${objectKey} failed`);
      last = await api('/game/world/interact', {
        method: 'POST',
        body: { missionNumber, objectKey },
      });
      assert.equal(last.status, 200, `pickup from ${objectKey} failed`);
      continue;
    }

    const result = await api('/game/world/interact', {
      method: 'POST',
      body: { missionNumber, objectKey },
    });

    if (type === 'expect409') {
      check(`${missionNumber} ${objectKey} is gated`, result.status === 409, JSON.stringify(result.data));
      continue;
    }

    assert.equal(result.status, 200, `interaction with ${objectKey} failed: ${JSON.stringify(result.data)}`);
    last = result;

    if (type === 'exit') {
      check(
        `mission ${missionNumber} completes only at the physical exit`,
        result.data.kind === 'exit' && result.data.missionCompleted?.number === missionNumber,
        JSON.stringify(result.data).slice(0, 300),
      );
    } else if (result.data.kind === 'transition') {
      area = result.data.areaKey;
    }
  }

  return last;
}

try {
  console.log(`Starting test API on port ${PORT}…`);
  server = await startServer();
  await db.connect();

  section('accounts');

  const registered = await api('/auth/register', {
    method: 'POST',
    auth: false,
    body: {
      username,
      email: `${username}@example.com`,
      password: 'password123',
      confirmPassword: 'password123',
    },
  });
  check('register returns a token and profile', registered.status === 201 && Boolean(registered.data.token));
  check('new survivor starts at New Survivor rank', registered.data.user?.rank?.label === 'New Survivor');
  token = registered.data.token;
  userId = registered.data.user.id;

  const duplicate = await api('/auth/register', {
    method: 'POST',
    auth: false,
    body: {
      username,
      email: `${username}@example.com`,
      password: 'password123',
      confirmPassword: 'password123',
    },
  });
  check('duplicate registration is rejected', duplicate.status === 409, String(duplicate.status));

  const wrongPassword = await api('/auth/login', {
    method: 'POST',
    auth: false,
    body: { identifier: username, password: 'wrong-password' },
  });
  check('wrong password is rejected', wrongPassword.status === 401, String(wrongPassword.status));

  const login = await api('/auth/login', {
    method: 'POST',
    auth: false,
    body: { identifier: username.toUpperCase(), password: 'password123' },
  });
  check('login accepts a case-insensitive username', login.status === 200 && Boolean(login.data.token));

  section('victory with one hint');

  const start = await api('/game/start', { method: 'POST', body: { mode: 'new' } });
  check('new run starts with three lives and zero score', start.data.game?.lives === 3 && start.data.game?.score === 0);
  check('mission catalogue exposes five missions', start.data.missions?.length === 5);

  const missionCiphers = [
    { backup_power: 2, exit_lock: 3, backup_power_hint: true },
    { food_container: 4, medical_locker: 5 },
    { generator_control: 6, grid_breaker: 7 },
    { transmission_console: 8, network_decoder: 9 },
    { tower_console: 0, final_authorization: 1 },
  ];

  let answer = null;
  for (let missionNumber = 0; missionNumber < missionCiphers.length; missionNumber += 1) {
    answer = await runMission(missionNumber + 1, missionCiphers[missionNumber]);
    check(
      `mission ${missionNumber + 1} awards the +100 mission bonus`,
      answer.data.missionCompleted?.bonus === 100,
      JSON.stringify(answer.data.missionCompleted),
    );
  }

  check('final mission reports victory and a +250 bonus', answer.data.missionCompleted?.victory === true && answer.data.missionCompleted?.victoryBonus === 250);
  check('hinted victory finishes with 845 points', answer.data.game?.score === 845, String(answer.data.game?.score));
  check('hinted victory keeps all three lives', answer.data.game?.lives === 3);
  check('victory is persisted', answer.data.game?.outcome === 'won');

  const stateAfterVictory = await api('/game/state');
  check('no active run remains after victory', stateAfterVictory.data.game === null);
  const achievementKeys = (stateAfterVictory.data.achievements ?? []).map((item) => item.key);
  check(
    'all seven achievements unlock, including Perfect Survivor',
    achievementKeys.length === 7 && achievementKeys.includes('perfect_survivor'),
    achievementKeys.join(', '),
  );
  check('Puzzle Specialist unlocks at ten solved ciphers', achievementKeys.includes('puzzle_specialist'));

  section('scoring, hints and lives');

  await api('/game/start', { method: 'POST', body: { mode: 'new' } });
  await api('/game/missions/1/start', { method: 'POST' });

  const hinted = await solveRound({
    missionNumber: 1,
    objectiveKey: 'backup_power',
    solution: 7,
    hint: true,
  });
  check('hinted cipher awards five points', hinted.data.points === 5, String(hinted.data.points));

  const duplicateAnswer = await api('/game/answer', {
    method: 'POST',
    body: { roundId: hinted.data.round?.id ?? (await db.query(
      `SELECT id FROM rounds WHERE game_id = $1 ORDER BY id DESC LIMIT 1`,
      [await activeGameId()],
    )).rows[0].id, answer: 7 },
  });
  check('answering the same cipher twice is rejected', duplicateAnswer.status === 409, String(duplicateAnswer.status));

  const wrongId = await seedRound({ missionNumber: 1, objectiveKey: 'backup_power', solution: 4 });
  const wrong = await api('/game/answer', { method: 'POST', body: { roundId: wrongId, answer: 5 } });
  check('wrong answer costs a life', wrong.data.lifeLost === true && wrong.data.game?.lives === 2);
  check('wrong answer reveals the correct digit only after scoring', wrong.data.correctAnswer === 4);

  const timeoutId = await seedRound({
    missionNumber: 1,
    objectiveKey: 'exit_lock',
    solution: 2,
    expired: true,
  });
  const timedOut = await api('/game/timeout', { method: 'POST', body: { roundId: timeoutId } });
  check('expired cipher costs a life', timedOut.data.expired === true && timedOut.data.game?.lives === 1);
  const timedOutAgain = await api('/game/timeout', { method: 'POST', body: { roundId: timeoutId } });
  check('repeated timeout cannot deduct a second life', timedOutAgain.data.alreadyHandled === true);
  const afterTimeout = await api('/game/state');
  check('timeout idempotency keeps one life', afterTimeout.data.game?.lives === 1);

  const complete = await solveRound({ missionNumber: 2, objectiveKey: 'food_container', solution: 3 });
  check('cipher solves after a life loss', complete.data.correct === true && complete.data.points === 10);

  const lastLifeId = await seedRound({ missionNumber: 2, objectiveKey: 'medical_locker', solution: 9 });
  const lastLife = await api('/game/answer', { method: 'POST', body: { roundId: lastLifeId, answer: 0 } });
  check('third life loss ends the run', lastLife.data.gameOver === true && lastLife.data.game?.outcome === 'lost');
  check('lost run keeps its score', lastLife.data.game?.score === 15, String(lastLife.data.game?.score));

  const expiredLastLife = await api('/game/answer', {
    method: 'POST',
    body: { roundId: lastLifeId, answer: 9 },
  });
  check('finished runs reject later answers', expiredLastLife.status === 409, String(expiredLastLife.status));

  section('progression persistence');

  await api('/game/start', { method: 'POST', body: { mode: 'new' } });
  const abandons = await api('/game/abandon', { method: 'POST' });
  check('abandoning ends the active run', abandons.data.game === null);

  const history = await api('/scores/history');
  check('history preserves won, lost and abandoned runs', history.data.totalRuns === 3, String(history.data.totalRuns));
  const outcomes = new Set(history.data.runs.map((run) => run.outcome));
  check('history records every outcome', outcomes.has('won') && outcomes.has('lost') && outcomes.has('abandoned'), [...outcomes].join(', '));
  check('history is paginated', history.data.page === 1 && Array.isArray(history.data.runs) && history.data.totalPages >= 1);

  const summary = await api('/scores/me');
  check('score summary reports three runs and one victory', summary.data.stats?.totalRuns === 3 && summary.data.stats?.victories === 1);
  check('score summary reports the best run', summary.data.user?.bestScore === 845, String(summary.data.user?.bestScore));
  check('score summary reports lifetime score', summary.data.user?.totalScore === 860, String(summary.data.user?.totalScore));
  check('score summary includes the global rank', Number.isInteger(summary.data.globalRank));

  const profile = await api(`/scores/players/${username.toUpperCase()}`);
  check('public profile is case-insensitive', profile.status === 200 && profile.data.user?.username === username);
  check('public profile never exposes the email', profile.data.user?.email === undefined);
  check('public profile hides other survivors', (await api('/scores/players/no_such_survivor')).status === 404);

  const board = await api('/scores/leaderboard?page=1&pageSize=5');
  check('leaderboard pagination is clamped and bounded', board.data.pageSize === 5 && board.data.leaderboard.length <= 5);
  check('leaderboard still returns the current survivor', board.data.me?.username === username);

  const invalidMission = await api('/game/interact', {
    method: 'POST',
    body: { missionNumber: 9, objectiveKey: 'backup_power' },
  });
  check('invalid mission numbers are rejected', invalidMission.status === 400, String(invalidMission.status));

  const invalidObject = await api('/game/interact', {
    method: 'POST',
    body: { missionNumber: 1, objectiveKey: 'not_a_terminal' },
  });
  check('invalid terminals are rejected before any cipher request', invalidObject.status === 400, String(invalidObject.status));

  section('unauthorised access');

  const anonymousState = await fetch(`${BASE}/game/state`);
  check('game state requires a token', anonymousState.status === 401, String(anonymousState.status));
  const anonymousScores = await fetch(`${BASE}/scores/leaderboard`);
  check('scores require a token', anonymousScores.status === 401, String(anonymousScores.status));
} catch (error) {
  failed += 1;
  console.error(`\nUNEXPECTED FAILURE: ${error.stack || error.message}`);
} finally {
  try {
    if (userId) await db.query('DELETE FROM users WHERE id = $1', [userId]);
  } catch (error) {
    console.error(`Cleanup failed: ${error.message}`);
  }
  await db.end().catch(() => {});
  await stopServer(server);
}

console.log(
  failed === 0
    ? `\nALL ${passed} INTEGRATION CHECKS PASSED`
    : `\n${failed} CHECK(S) FAILED, ${passed} passed`,
);
process.exit(failed === 0 ? 0 : 1);

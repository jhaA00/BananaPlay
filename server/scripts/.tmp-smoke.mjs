/* Temporary final UI smoke check. Deleted after use. */
import pg from 'pg';
import { config } from '../src/config.js';

const db = new pg.Client({ connectionString: config.databaseUrl });
await db.connect();
let failures = 0;
let token = null;
const username = `smoke_${Date.now().toString().slice(-8)}`;
function check(label, condition, detail = '') {
  console.log(`${condition ? 'PASS' : 'FAIL'}  ${label}${condition ? '' : ` :: ${detail}`}`);
  if (!condition) failures += 1;
}
const reg = await fetch('http://localhost:4100/api/auth/register', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ username, email: `${username}@example.com`, password: 'password123', confirmPassword: 'password123' }),
}).then((r) => r.json());
token = reg.token;
const authed = (path, body) => fetch(`http://localhost:4100/api${path}`, {
  method: 'POST',
  headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
  body: body === undefined ? undefined : JSON.stringify(body),
}).then((r) => r.json());
await authed('/game/start', { mode: 'new' });
await authed('/game/missions/1/start');

const targets = await fetch('http://localhost:9222/json').then((r) => r.json());
const target = targets.find((item) => item.type === 'page');
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
  ws.addEventListener('open', resolve, { once: true });
  ws.addEventListener('error', reject, { once: true });
});
let nextId = 1;
const pending = new Map();
ws.addEventListener('message', (event) => {
  const message = JSON.parse(event.data);
  if (message.id && pending.has(message.id)) {
    const { resolve, reject } = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) reject(new Error(JSON.stringify(message.error)));
    else resolve(message.result);
  }
});
const send = (method, params = {}) => new Promise((resolve, reject) => {
  const id = nextId++;
  pending.set(id, { resolve, reject });
  ws.send(JSON.stringify({ id, method, params }));
});
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function evaluate(expression) {
  const { result, exceptionDetails } = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (exceptionDetails) throw new Error(exceptionDetails.exception?.description ?? exceptionDetails.text);
  return result.value;
}
async function go(path) {
  await send('Page.navigate', { url: `http://localhost:4100${path}` });
  await wait(1800);
}

await send('Page.enable');
await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 980, deviceScaleFactor: 1, mobile: false });
await go('/login');
await evaluate(`localStorage.setItem('banana.token', ${JSON.stringify(token)})`);

for (const [path, selector] of [
  ['/dashboard', '.ls-page'],
  ['/missions', '.ls-mission-map'],
  ['/missions/1', '.ls-briefing'],
  ['/missions/1/play', '.ls-play-scene'],
  ['/leaderboard', '.ls-table'],
  ['/history', '.ls-page'],
  ['/profile', '.ls-page'],
]) {
  await go(path);
  check(`${path} renders`, await evaluate(`!!document.querySelector(${JSON.stringify(selector)})`));
  check(`${path} has no desktop overflow`, await evaluate('document.documentElement.scrollWidth <= window.innerWidth + 1'));
}

await go('/missions/1/play');
await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
await wait(800);
check('mission scene has no mobile overflow', await evaluate('document.documentElement.scrollWidth <= window.innerWidth + 1'));
const bg = await evaluate(`getComputedStyle(document.querySelector('.ls-shell')).backgroundColor`);
check('survival theme stylesheet is active', bg !== 'rgba(0, 0, 0, 0)', bg);

await db.query('DELETE FROM users WHERE id = $1', [reg.user.id]);
await db.end();
ws.close();
console.log(failures === 0 ? '\nALL FINAL UI SMOKE CHECKS PASSED' : `\n${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);

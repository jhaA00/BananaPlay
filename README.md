# 📡 THE LAST SIGNAL

**A post-apocalyptic survival adventure built on the Banana Puzzle stack.**

The lights went out. The network went silent. Somewhere underground, a shelter is running out of
air, and the only way out is through five sealed missions. Each door, generator and transmitter is
guarded by a **security cipher** — a numerical puzzle served by the
[UOB Banana API](https://marcconrad.com/uob/banana/api.php). Solve the ciphers, keep three lives
intact, and send the last signal before the silence wins.

This is a full-stack college project: React + Vite on the front, Express + PostgreSQL behind it,
JWT authentication, server-authoritative scoring, persistent progress and a global survivor
leaderboard.

![Tech stack](https://img.shields.io/badge/React-18-61dafb?style=flat-square)
![Tech stack](https://img.shields.io/badge/Vite-6-646cff?style=flat-square)
![Tech stack](https://img.shields.io/badge/Node-Express-339933?style=flat-square)
![Tech stack](https://img.shields.io/badge/PostgreSQL-16-4169e1?style=flat-square)

---

## The story

| # | Mission | Location | Reward |
| - | ------- | -------- | ------ |
| 1 | **Escape the Shelter** | Underground Shelter B-7 | Shelter exit opened |
| 2 | **The Supply Run** | Ruins of Meridian Market | Food, medicine and batteries secured |
| 3 | **Restore the Power** | Substation 04 | Electricity restored |
| 4 | **The Silent Network** | Communications Centre | Communications network restored |
| 5 | **The Last Signal** | Emergency Transmission Tower | The Last Signal transmitted |

Missions unlock in order. Every mission hides two interactive objects, and the important ones open
a **security terminal**: a Banana API cipher with a 45-second window and a single-digit answer.
Mission flavour objects also hold supplies that are carried in the run inventory.

## Features

- **Account system** — register and log in with a username or email. Passwords are hashed with
  bcrypt and sessions use JSON Web Tokens. Registration validates the password and confirmation on
  both the client and the server.
- **Five-mission campaign** — a sequential mission map, briefing screens, illustrated scenes and a
  final transmission tower with a victory sequence.
- **Security terminals** — each terminal loads a cipher from the UOB Banana API, validates the
  answer on the server, and locks when the 45-second timer runs out.
- **Lives and scoring** — every run starts with **3 lives**. A wrong answer or an expired cipher
  costs one life. Losing the third life ends the run immediately.
- **Hints** — request a five-number range containing the answer. A hinted cipher is worth **+5**
  instead of **+10**.
- **Inventory** — supplies recovered during missions are stored per run and shown in the HUD.
- **Server-authoritative rules** — timers, answers, lives, rewards, mission completion and
  duplicate-answer prevention all happen in PostgreSQL transactions. The browser never receives a
  cipher solution before scoring.
- **Persistent progress** — active runs, completed missions, inventory, scores and finished runs
  survive refreshes, logins and server restarts.
- **Leaderboard and profiles** — a paginated global ranking with lifetime score, best run and
  missions cleared, plus public survivor files that never expose email addresses.
- **Run history** — every finished run is archived as a victory (`won`), loss (`lost`) or
  abandonment (`abandoned`).
- **Achievements and ranks** — seven unlockable badges and five survivor ranks based on lifetime
  score.
- **Responsive UI** — a dark survival-themed interface that works on desktop and mobile.

## Scoring, ranks and achievements

| Action | Points |
| ------ | ------ |
| Solve a cipher | +10 |
| Solve a hinted cipher | +5 |
| Complete a mission | +100 |
| Transmit the final signal | +250 |
| Wrong answer or timeout | −1 life |

A flawless run with no hints scores **850** (10 ciphers × 10, five mission bonuses, one victory
bonus). Using exactly one hint still finishes with **845**.

**Survivor ranks** (based on lifetime score):

| Rank | Threshold |
| ---- | --------- |
| New Survivor | 0 |
| Field Explorer | 100 |
| Resource Hunter | 300 |
| Signal Specialist | 600 |
| Last Signal Hero | 1000 |

**Achievements:**

| Badge | How to earn it |
| ----- | -------------- |
| 📡 First Transmission | Complete mission 1 |
| 🎒 Supply Hunter | Complete mission 2 |
| ⚡ Power Restored | Complete mission 3 |
| 📶 Network Reconnected | Complete mission 4 |
| 🔆 Last Signal | Complete mission 5 |
| 🧩 Puzzle Specialist | Solve ten or more ciphers |
| 🛡️ Perfect Survivor | Win a run without losing a life |

## Tech stack

| Layer     | Technology |
| --------- | ---------- |
| Frontend  | React 18, React Router 6, Vite 6 |
| Backend   | Node.js, Express 4 |
| Database  | PostgreSQL, tracked SQL migrations |
| Auth      | JWT (`jsonwebtoken`), `bcryptjs` |
| Security  | Helmet, CORS allow-list, rate limiting |
| Dev tools | npm workspaces, `concurrently`, `node --watch` |

## Project structure

```
banana-puzzle/
├── client/                       # React + Vite frontend
│   ├── src/
│   │   ├── auth/                 # Auth context and protected routes
│   │   ├── components/           # Layout, HUD, terminal, badges, modal
│   │   ├── game/                 # Client mirror of ranks, badges and scenes
│   │   ├── hooks/                # Game state and countdown hooks
│   │   ├── pages/                # Landing, dashboard, missions, scores, profile
│   │   ├── api.js                # Fetch wrapper and token storage
│   │   ├── App.jsx               # Routes
│   │   └── index.css             # All styling
│   └── vite.config.js            # Dev server and /api proxy
├── server/                       # Express API
│   ├── scripts/
│   │   ├── setup-db.js           # Creates the database, schema and migrations
│   │   └── test-game.mjs         # End-to-end integration test
│   └── src/
│       ├── game/                 # Mission catalogue, ranks and achievements
│       ├── middleware/           # JWT auth middleware
│       ├── migrations/           # Additive, tracked SQL migrations
│       ├── routes/               # /auth, /game, /scores
│       ├── services/             # Banana API client and game logic
│       ├── utils/                # HTTP helpers and presenters
│       ├── schema.sql            # Baseline tables and indexes
│       ├── config.js             # Environment configuration
│       ├── db.js                 # PostgreSQL pool and migration runner
│       └── index.js              # Express app
├── package.json                  # Workspace scripts
└── README.md
```

## Getting started

### Prerequisites

- **Node.js 18 or newer** (Node 20+ recommended)
- **PostgreSQL 13 or newer**, running locally
- A PostgreSQL user that can create databases, or an existing database you can point to

### 1. Install dependencies

```bash
npm install
```

This installs the root, client and server dependencies through npm workspaces.

### 2. Configure the server

```bash
cp server/.env.example server/.env
```

```dotenv
PORT=4000
NODE_ENV=development
DATABASE_URL=postgresql://localhost:5432/banana_game
JWT_SECRET=replace-this-with-a-long-random-secret
CLIENT_ORIGIN=http://localhost:5173
BANANA_API_URL=https://marcconrad.com/uob/banana/api.php
```

- Set `DATABASE_URL` to your PostgreSQL connection string. Include a password when your database
  requires one: `postgresql://user:password@localhost:5432/banana_game`.
- Replace `JWT_SECRET` with a long random value before deploying.
- `CLIENT_ORIGIN` accepts a comma-separated list of allowed frontend origins.

### 3. Create the database and schema

```bash
npm run db:setup
```

This creates the database if needed, applies the baseline `schema.sql`, then runs every tracked
migration in `server/src/migrations/`. It is safe to run more than once. The server also applies
missing migrations on startup.

Migrations are **additive**: they never drop or recreate `users`, `games` or `rounds`, so existing
accounts and history are preserved. Applied files are recorded in `schema_migrations`.

### 4. Run the app

```bash
npm run dev
```

- Frontend: <http://localhost:5173>
- API: <http://localhost:4000>
- Health check: <http://localhost:4000/api/health>

Vite proxies `/api` requests to Express, so during development the browser only talks to port 5173.

## Production build

```bash
npm run build
NODE_ENV=production npm start
```

`npm run build` creates `client/dist`. When that folder exists, Express serves the built frontend
itself, so the whole app runs from a single process at <http://localhost:4000>.

## How to play

1. Register a new account, or log in with an existing one.
2. Start a run from the dashboard. The mission map shows mission 1 as available and the rest locked.
3. Open a mission briefing, then enter the scene.
4. Inspect the interactive objects. Security terminals open a Banana API cipher; useful objects add
   supplies to the inventory.
5. Enter a digit from 0 to 9 before the 45-second window closes.
6. A correct answer scores **+10** and marks the terminal solved. A hint narrows the answer to a
   five-number range but reduces that cipher to **+5**.
7. A wrong answer or timeout costs one life. At zero lives the run ends as a loss.
8. Complete both terminals in a mission to earn the mission bonus and unlock the next mission.
9. Finish mission 5 to transmit the Last Signal and earn the victory bonus.
10. Review your position on the leaderboard, browse public survivor files, and read your full run
    history.

Progress is stored in PostgreSQL, so you can close the browser and continue the same active run
later. Starting a new run explicitly abandons the current one, and the abandoned run stays in
history.

## API reference

All endpoints return JSON. Protected routes require an `Authorization: Bearer <token>` header.

| Method | Endpoint | Auth | Description |
| ------ | -------- | ---- | ----------- |
| GET | `/api/health` | No | Health check. |
| POST | `/api/auth/register` | No | Create an account. Body: `username`, `email`, `password`, `confirmPassword`. |
| POST | `/api/auth/login` | No | Log in. Body: `identifier` (email or username), `password`. |
| GET | `/api/auth/me` | Yes | Current user profile, rank and stats. |
| GET | `/api/game/state` | Yes | Active run, mission states, inventory, achievements and any open terminal. |
| GET | `/api/game/missions` | Yes | The public mission catalogue. |
| POST | `/api/game/start` | Yes | Start or continue a run. Body: `{ "mode": "new" }` to replace the active run. |
| POST | `/api/game/missions/:missionNumber/start` | Yes | Enter a mission. |
| POST | `/api/game/interact` | Yes | Inspect an object. Body: `missionNumber`, `objectiveKey`. |
| POST | `/api/game/answer` | Yes | Answer a cipher. Body: `roundId`, `answer` (0–9). |
| POST | `/api/game/hint` | Yes | Reveal a range hint for a round. Body: `roundId`. |
| POST | `/api/game/timeout` | Yes | Report an expired cipher. Body: `roundId`. Idempotent. |
| POST | `/api/game/restart` | Yes | Abandon the active run and start a fresh one. |
| POST | `/api/game/abandon` | Yes | End the active run and keep it in history. |
| GET | `/api/scores/leaderboard` | Yes | Paginated global leaderboard. Query: `page`, `pageSize`. |
| GET | `/api/scores/me` | Yes | Career summary, rank progress, global placement and achievements. |
| GET | `/api/scores/players/:username` | Yes | Public survivor file (case-insensitive, never exposes email). |
| GET | `/api/scores/history` | Yes | Paginated run history. Query: `page`, `pageSize`. |

### Example requests

```bash
# Register
curl -X POST http://localhost:4000/api/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"username":"player1","email":"player1@example.com","password":"secret123","confirmPassword":"secret123"}'

# Log in
curl -X POST http://localhost:4000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"identifier":"player1","password":"secret123"}'

# Load the active run (replace TOKEN with the token from register/login)
curl http://localhost:4000/api/game/state \
  -H 'Authorization: Bearer TOKEN'
```

The cipher `imageUrl` is sent to the browser, but the solution is kept in PostgreSQL. It is only
revealed after the round has been scored (and for a wrong answer, when the life is already lost).

### Answer response

A correct answer returns `correct: true`, the points awarded, the updated game and the next round
state. A wrong answer returns `correct: false`, the correct digit, the updated game and either the
next round or `gameOver: true`. An expired answer returns `expired: true` and costs a life; repeating
the same timeout cannot deduct a second life. Answering an already-closed round returns HTTP `409`.

## Database design

| Table | Purpose |
| ----- | ------- |
| `users` | Account details, password hash and aggregate stats (`best_score`, `total_score`, `best_streak`, `games_played`). |
| `games` | One row per run: score, lives, streak, mission progress, status and outcome. |
| `rounds` | One row per cipher: image URL, solution, timer, hint state, answer and points. |
| `game_missions` | Per-run mission states (`locked`, `available`, `in_progress`, `completed`). |
| `game_resources` | Supplies recovered during a run. |
| `user_achievements` | Unlocked badges, unique per user. |
| `game_events` | Audit trail of starts, answers, hints, losses and outcomes. |
| `schema_migrations` | Applied migration filenames. |

Indexes enforce the important invariants:

- one active run per user (`games_one_active_per_user`),
- one open cipher per run (`rounds_one_open_per_game`),
- one mission row per run and mission number,
- unique achievements per user.

Deleting a user cascades to their games, rounds, resources, events and achievements.

## Testing

The integration test starts its own API process, creates a throwaway survivor, and seeds cipher
rounds directly with known solutions — so it does not depend on the external Banana API and is
fully repeatable.

```bash
npm run test:integration
```

By default the test API runs on port **4111** (separate from the dev server). Override it if needed:

```bash
TEST_PORT=4120 npm run test:integration
```

The suite covers the perfect victory path, every scoring rule, hints, wrong answers, timeout
idempotency, duplicate-answer rejection, all seven achievements, mission progression, abandoned and
lost runs, history, career summaries, public profiles, leaderboard pagination, invalid input and
unauthenticated access. The test deletes its user and runs before exiting.

The client can also be built as a syntax and production check:

```bash
npm run build
```

## Available scripts

| Command | Description |
| ------- | ----------- |
| `npm run dev` | Run the API and Vite dev server together. |
| `npm run dev:server` | Run only the Express API with file watching. |
| `npm run dev:client` | Run only the Vite frontend. |
| `npm run build` | Build the React client into `client/dist`. |
| `npm start` | Start Express (serves the built client if it exists). |
| `npm run db:setup` | Create the database and apply the schema and migrations. |
| `npm run test:integration` | Run the end-to-end API integration suite. |

## Security notes

- Passwords are hashed with bcrypt; plain-text passwords are never stored.
- JWT secrets and database credentials live in `server/.env`, which is git-ignored.
- Auth routes are rate-limited separately from gameplay routes.
- CORS only allows the configured origins, plus same-origin requests when Express serves the build.
- The cipher solution is never sent to the browser before the player answers.
- Scoring, lives, timers and rewards are decided by the server, not the client.
- Public profiles expose usernames and survival stats only — never email addresses.
- Helmet sets a content security policy that permits cipher images from HTTPS sources.

This project is intended for coursework. For a real deployment, use HTTPS, a managed database, a
long random JWT secret, and rotate secrets regularly.

## Troubleshooting

**`ECONNREFUSED` or “Cannot reach the server”**
Make sure PostgreSQL is running (`brew services start postgresql` on macOS) and that `DATABASE_URL`
points to the right host and port.

**`database "banana_game" does not exist`**
Run `npm run db:setup`.

**“That username is already taken”**
Usernames and emails are unique. Log in instead, or choose another username.

**Cipher image does not load**
The UOB Banana API must be reachable from the server. Check `BANANA_API_URL` and your network
connection. The server keeps a small warm cache and retries before returning a friendly 503.

**Port already in use**
Change `PORT` in `server/.env`, and update the Vite proxy target in `client/vite.config.js` to
match. The integration test uses its own dedicated port and does not conflict with the dev server.

## Credits

- Cipher images and solutions: [UOB Banana API](https://marcconrad.com/uob/banana/api.php)
- Story, mission design and interface: built for this project
- Built with React, Vite, Express and PostgreSQL

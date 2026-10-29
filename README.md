# 🍌 Banana Puzzle

A full-stack puzzle game built as a college project. Register an account, log in, and solve
banana-themed number puzzles. Every answer is checked on the server, and your best scores live
on a shared leaderboard.

The puzzles come from the [UOB Banana API](https://marcconrad.com/uob/banana/api.php): each
round is an image with one missing number.

![Tech stack](https://img.shields.io/badge/React-18-61dafb?style=flat-square)
![Tech stack](https://img.shields.io/badge/Vite-6-646cff?style=flat-square)
![Tech stack](https://img.shields.io/badge/Node-Express-339933?style=flat-square)
![Tech stack](https://img.shields.io/badge/PostgreSQL-16-4169e1?style=flat-square)

---

## Features

- **Accounts** — register and log in with a username or email. Passwords are hashed with bcrypt,
  and sessions use JSON Web Tokens.
- **Playable puzzles** — the puzzle image is loaded from the UOB Banana API. Type a digit or use
  the on-screen keypad to answer.
- **Lives and scoring** — start each run with 3 lives. A correct answer is worth **+10 points**;
  using a hint halves that puzzle to **+5 points**. A wrong answer costs one life and reveals the
  correct digit.
- **Hints** — ask for a hint and get a 5-number range that contains the answer.
- **Scoreboard** — a global leaderboard ranked by best score, plus your personal best, total
  score, games played, and recent runs.
- **Persistent progress** — games, rounds, and scores are stored in PostgreSQL, so refreshing the
  page does not lose a run.
- **Responsive UI** — dark banana-themed design that works on desktop and mobile.

## Tech stack

| Layer      | Technology                                        |
| ---------- | ------------------------------------------------- |
| Frontend   | React 18, React Router 6, Vite 6                  |
| Backend    | Node.js, Express 4                                |
| Database   | PostgreSQL (`pg`)                                 |
| Auth       | JWT (`jsonwebtoken`), `bcryptjs`                  |
| Security   | Helmet, CORS allow-list, rate limiting            |
| Dev tools  | npm workspaces, `concurrently`, `node --watch`    |

## Project structure

```
banana-puzzle/
├── client/                  # React + Vite frontend
│   ├── src/
│   │   ├── auth/            # Auth context and protected routes
│   │   ├── components/      # Layout, loader, modal, brand
│   │   ├── pages/           # Play, Scoreboard, Auth, NotFound
│   │   ├── api.js           # Fetch wrapper and token storage
│   │   ├── App.jsx          # Routes
│   │   └── index.css        # All styling
│   └── vite.config.js       # Dev server and /api proxy
├── server/                  # Express API
│   ├── scripts/
│   │   ├── setup-db.js      # Creates the database and schema
│   │   └── seed.js          # Optional demo leaderboard data
│   └── src/
│       ├── middleware/      # JWT auth middleware
│       ├── routes/          # /auth, /game, /scores
│       ├── services/        # Banana API client and game logic
│       ├── utils/           # HTTP helpers and presenters
│       ├── schema.sql       # Tables and indexes
│       ├── config.js        # Environment configuration
│       ├── db.js            # PostgreSQL pool and migration runner
│       └── index.js         # Express app
├── package.json             # Workspace scripts
└── README.md
```

## Getting started

### Prerequisites

- **Node.js 18 or newer** (Node 20+ recommended)
- **PostgreSQL 13 or newer**, running locally
- A PostgreSQL user that can create databases, or an existing database you can point to

### 1. Install dependencies

From the project root:

```bash
npm install
```

This installs the root, client, and server dependencies through npm workspaces.

### 2. Configure the server

Copy the example environment file and edit it:

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

- Set `DATABASE_URL` to your PostgreSQL connection string. If your database uses a password, add
  it as `postgresql://user:password@localhost:5432/banana_game`.
- Replace `JWT_SECRET` with a long random value before deploying.
- On macOS with a Homebrew PostgreSQL install, the default `postgresql://localhost:5432/banana_game`
  usually works with your operating-system username.

### 3. Create the database and schema

```bash
npm run db:setup
```

This connects to PostgreSQL, creates the `banana_game` database if it does not exist, and applies
`schema.sql`. It is safe to run more than once.

The server also applies the schema on startup, but `db:setup` is the explicit first-time step.

### 4. Optional: seed demo players

```bash
npm run db:seed
```

This adds six demo accounts so the leaderboard is not empty during a presentation. All of them use
the password **`banana123`**:

| Username     | Email               |
| ------------ | ------------------- |
| `PixelPeeler`| `pixel@example.com` |
| `BananaBaron`| `baron@example.com` |
| `CodeMonkey` | `monkey@example.com`|
| `PeelGood`   | `peel@example.com`  |
| `MangoMike`  | `mango@example.com` |
| `FruitLoop`  | `fruit@example.com` |

### 5. Run the app

```bash
npm run dev
```

- Frontend: <http://localhost:5173>
- API: <http://localhost:4000>
- Health check: <http://localhost:4000/api/health>

Vite proxies `/api` requests to Express, so the browser only talks to port 5173 during
development.

## Production build

```bash
npm run build
NODE_ENV=production npm start
```

`npm run build` creates `client/dist`. When that folder exists, Express serves the built frontend
itself, so the whole app runs from a single process at <http://localhost:4000>.

Set `CLIENT_ORIGIN` to your real frontend origin if it differs from the API origin.

## How to play

1. Register a new account, or log in with a demo account.
2. Open the **Play** tab. A puzzle image shows an equation with one missing number.
3. Enter a digit from 0 to 9 and submit, or tap the digit pad.
4. A correct answer scores **+10 points** and loads the next puzzle.
5. Stuck? Use a hint to reveal a five-number range. That puzzle is then worth **+5 points**.
6. A wrong answer costs one of your **3 lives** and shows the correct digit.
7. At zero lives the run ends and is saved. You can also press **End run** to save early.
8. Check the **Scoreboard** tab to see the global rankings and your recent runs.

Runs are saved in PostgreSQL, so you can close the browser and continue the same run later.

## API reference

All endpoints return JSON. Protected routes require an `Authorization: Bearer <token>` header.

| Method | Endpoint                 | Auth | Description                                                    |
| ------ | ------------------------ | ---- | -------------------------------------------------------------- |
| GET    | `/api/health`            | No   | Health check.                                                  |
| POST   | `/api/auth/register`     | No   | Create an account. Body: `username`, `email`, `password`.       |
| POST   | `/api/auth/login`        | No   | Log in. Body: `identifier` (email or username), `password`.     |
| GET    | `/api/auth/me`           | Yes  | Current user profile.                                          |
| GET    | `/api/game/state`        | Yes  | Active run and open puzzle, creating them if needed.            |
| POST   | `/api/game/answer`       | Yes  | Submit an answer. Body: `roundId`, `answer` (0–9).               |
| POST   | `/api/game/hint`         | Yes  | Reveal a hint for a round. Body: `roundId`.                     |
| POST   | `/api/game/restart`      | Yes  | End the current run and start a fresh one.                     |
| GET    | `/api/scores/leaderboard`| Yes  | Global leaderboard with the current player's position.          |
| GET    | `/api/scores/history`    | Yes  | The current player's recent finished runs.                     |

### Example requests

```bash
# Register
curl -X POST http://localhost:4000/api/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"username":"player1","email":"player1@example.com","password":"secret123"}'

# Log in
curl -X POST http://localhost:4000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"identifier":"player1","password":"secret123"}'

# Load a game (replace TOKEN with the token from register/login)
curl http://localhost:4000/api/game/state \
  -H 'Authorization: Bearer TOKEN'
```

The response to `/api/game/state` includes the puzzle `imageUrl` but **never the solution**. The
solution stays in PostgreSQL and is only checked inside `POST /api/game/answer`.

### Answer response

A correct answer returns `correct: true`, the points awarded, the updated game, and the next
puzzle. A wrong answer returns `correct: false`, the `correctAnswer`, the updated game, and either
the next puzzle or `gameOver: true` when lives reach zero.

## Database design

| Table    | Purpose                                                                 |
| -------- | ----------------------------------------------------------------------- |
| `users`  | Account details, password hash, and aggregate stats (`best_score`, `total_score`, `best_streak`, `games_played`). |
| `games`  | One row per run: score, lives, streak, correct answers, status.          |
| `rounds` | One row per puzzle: image URL, solution, hint state, and answer status.  |

Indexes enforce two rules at the database level:

- one active run per user (`games_one_active_per_user`),
- one open puzzle per run (`rounds_one_open_per_game`).

Deleting a user cascades to their games and rounds.

## Available scripts

| Command            | Description                                              |
| ------------------ | -------------------------------------------------------- |
| `npm run dev`      | Run the API and Vite dev server together.                |
| `npm run dev:server` | Run only the Express API with file watching.           |
| `npm run dev:client` | Run only the Vite frontend.                            |
| `npm run build`    | Build the React client into `client/dist`.               |
| `npm start`        | Start Express (serves the built client if it exists).    |
| `npm run db:setup` | Create the database and apply the schema.                |
| `npm run db:seed`  | Add the optional demo accounts.                          |

## Security notes

- Passwords are hashed with bcrypt; plain-text passwords are never stored.
- JWT secrets and database credentials live in `server/.env`, which is git-ignored.
- Auth routes are rate-limited separately from gameplay routes.
- CORS only allows origins listed in `CLIENT_ORIGIN`.
- The puzzle solution is never sent to the browser before the player answers.
- Helmet sets a content security policy that permits puzzle images from HTTPS sources.

This project is intended for coursework. For a real deployment, use HTTPS, a managed database,
a long random JWT secret, and rotate secrets regularly.

## Troubleshooting

**`ECONNREFUSED` or “Cannot reach the server”**
Make sure PostgreSQL is running (`brew services start postgresql` on macOS) and that
`DATABASE_URL` points to the right host and port.

**`database "banana_game" does not exist`**
Run `npm run db:setup`.

**“That username is already taken”**
Usernames and emails are unique. Log in instead, or choose another username.

**Puzzle image does not load**
The UOB Banana API must be reachable from the server. Check `BANANA_API_URL` and your network
connection, then reload the puzzle.

**Port already in use**
Change `PORT` in `server/.env`, and update the Vite proxy target in `client/vite.config.js` to
match.

## Credits

- Puzzle images and solutions: [UOB Banana API](https://marcconrad.com/uob/banana/api.php)
- Built with React, Vite, Express, and PostgreSQL.

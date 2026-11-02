# Branch Documentation — The Last Signal

This document describes every feature branch in the repository, the work each
branch contains, and its merge status.

## Branch overview

| Branch | Purpose | Merge status |
| ------ | ------- | ------------ |
| `main` | Production-ready trunk. Contains every merged feature. | — |
| `feature/authentication-system` | JWT authentication, registration, login, logout, bcrypt password hashing, confirm-password validation. | Merged into `main` |
| `feature/mission-progression` | Five-mission campaign, server-enforced puzzle timers, persisted mission state, `game_missions` table, mission start and completion logic. | Merged into `main` |
| `feature/survival-game-ui` | Full React survival UI — mission map, briefing screens, dashboard, leaderboard, history page, profile page, survival HUD, security terminal component. | Merged into `main` |
| `feature/profiles-and-scores` | Public survivor profiles, score summary endpoint, paginated leaderboard with global ranking, career statistics. | Merged into `main` |
| `feature/cipher-network-polish` | Banana API warm cache (pre-fetches four puzzles), automatic retry on failure, expired game-over run cleanup. | Merged into `main` |
| `feature/final-polish` | Removed legacy `Play.jsx` and `Scoreboard.jsx` pages, tightened CSS, updated the database schema, rewrote the README. | Merged into `main` |
| `feature/exploration-engine` | 2D exploration engine — canvas renderer, WASD/arrow-key movement, collision detection, proximity-based interaction, per-area world state, objective tracker, inventory panel, story intro, area transitions, five fully designed mission worlds. | Merged into `main` |

## Branch details

### `feature/authentication-system`

**What was built:**

- Express `/api/auth` routes: `POST /register`, `POST /login`, `GET /me`.
- Passwords hashed with bcrypt (cost factor 10).
- JSON Web Token session: `signToken` and `requireAuth` middleware.
- Server-side validation of username format, email format, password length and
  confirm-password match.
- React `AuthContext` with `useAuth` hook, `ProtectedRoute` component and
  `GuestOnly` wrapper.
- `AuthPage.jsx` with login and register modes.
- Token stored in `localStorage`; logout clears the token and redirects.
- Constant-time comparison against a dummy hash for non-existent users.

### `feature/mission-progression`

**What was built:**

- Five-mission definition file (`game/missions.js`) with terminals, flavour
  objects, resources, achievements and story text.
- `game_missions` table tracking per-run mission status (`locked`, `available`,
  `in_progress`, `completed`).
- Server-enforced 45-second puzzle timer using `expires_at` on the `rounds`
  table.
- `mission_number` and `objective_key` columns on rounds, linking every puzzle
  to a specific mission terminal.
- Mission completion logic: all terminals solved → mission marked complete →
  next mission unlocked.
- `001_survival.sql` migration adding `current_mission`, `missions_completed`,
  `outcome`, mission states and resource tables.

### `feature/survival-game-ui`

**What was built:**

- `MissionMap.jsx` — sequential mission selector with lock/unlock indicators.
- `MissionBriefing.jsx` — story, objectives and terminal list before entering.
- `MissionPlay.jsx` — gameplay page integrating the scene, HUD and terminal.
- `MissionScene.jsx` — SVG backdrop with positioned interactive objects.
- `SecurityTerminal.jsx` — Banana API puzzle UI with countdown bar, digit
  keypad, hint system, image error recovery and feedback states.
- `SurvivalHud.jsx` — lives, score, streak and mission indicator.
- `Dashboard.jsx` — player overview with active run and quick actions.
- `Leaderboard.jsx` — paginated global ranking table.
- `History.jsx` — paginated list of finished runs.
- `Profile.jsx` and `PublicProfile.jsx` — personal and public survivor pages.
- `Brand.jsx`, `Layout.jsx`, `Modal.jsx`, `Loader.jsx`, `AchievementBadge.jsx`,
  `RankBadge.jsx` — shared UI components.
- Dark survival-themed CSS with amber accents and muted green indicators.

### `feature/profiles-and-scores`

**What was built:**

- `GET /api/scores/me` — authenticated score summary with rank, global rank,
  career stats and achievements.
- `GET /api/scores/players/:username` — public profile with recent runs.
- `GET /api/scores/leaderboard` — paginated leaderboard using a window-function
  CTE for dense ranking.
- `GET /api/scores/history` — paginated run history.
- `user_achievements` table with unique constraint per user.
- Seven achievement definitions evaluated after every answer and mission
  completion.
- Five survivor ranks based on lifetime score.

### `feature/cipher-network-polish`

**What was built:**

- Warm Banana API cache: four puzzles pre-fetched on first request, refilled
  in the background after each cache hit.
- Retry logic (three attempts) before returning a 503 to the player.
- Eight-second `AbortSignal.timeout` per fetch to the external API.
- Payload validation: the service rejects responses missing a valid question
  URL or integer solution.
- Expired-run cleanup: runs whose lives reached zero are finalised with
  `outcome = 'lost'` when the player next loads game state.

### `feature/final-polish`

**What was built:**

- Removed `Play.jsx` and `Scoreboard.jsx` (replaced by the mission map and
  leaderboard).
- Removed `server/scripts/seed.js` (replaced by the integration test).
- Added `server/scripts/test-game.mjs` — end-to-end integration test covering
  the full victory path, scoring, hints, wrong answers, timeout idempotency,
  achievements, history, profiles and leaderboard.
- Tightened `index.css`: removed unused legacy styles, consolidated variables.
- Updated `schema.sql` with `current_mission` default and `outcome` column.
- Rewrote `README.md` with full feature list, scoring rules, API documentation,
  database design, testing instructions and troubleshooting guide.

### `feature/exploration-engine`

**What was built:**

- `game/worlds.js` — authoritative world definitions for all five missions:
  room layouts (areas with walls, props, spawn points), interactive objects
  with position, kind, prerequisites, pickups and objective links, doors
  connecting areas, and structured objectives with dependency chains.
- `services/world.js` — exploration endpoints: `loadWorld`, `savePosition`,
  `markIntroSeen`, `interactWithObject`, `openTerminal`, `legacyInteract`.
  Every interaction validates the authenticated player's game, mission status,
  area membership and prerequisite objectives before granting any reward.
- `services/world-state.js` — low-level state persistence: `ensureWorldRows`,
  `syncObjectiveStates`, `syncObjectStates`, `setObjectStatus`,
  `completeObjective`, `markTerminalSolved`, `applyPickup`, `consumeItem`,
  `loadWorldSnapshot`.
- `migrations/002_exploration.sql` — `game_world_state` (player position,
  area, facing), `game_objects` (per-object status with eight possible states),
  `game_objectives` (locked/pending/completed).
- `hooks/useExploration.js` — client-side game loop: keyboard and virtual D-pad
  input, axis-separated collision via `moveEntity`, camera follow with
  smoothing, proximity detection via `nearestInteractable`, position sync
  throttled to 900 ms, area transition detection for doors.
- `game/engine/renderer.js` — Canvas 2D renderer: tiled floor, 3D-extruded
  walls and props, animated player sprite with directional facing and walk
  cycle, object icons with glow/pulse, labels, darkness overlay with radial
  gradient and flashlight cone, screen vignette.
- `game/engine/geometry.js` — `collidesAt`, `moveEntity` (sub-pixel-safe
  multi-step), `nearestInteractable`, `blockedRects`, `clamp`.
- `game/themes.js` — five colour palettes (shelter, city, substation, comms,
  tower) and two icon lookup tables.
- `components/exploration/ExplorationScene.jsx` — canvas viewport, scanline
  overlay, location and power indicators, objective tracker, inventory panel,
  area transition caption, interaction prompt, touch D-pad with E button.
- `components/exploration/StoryIntro.jsx` — mission briefing modal shown on
  first entry: story text, objective list, movement control guide.
- `components/exploration/InteractionPrompt.jsx` — context-sensitive "Press E"
  prompt that adapts its label to the object's kind and state.
- `components/exploration/ObjectiveTracker.jsx` — live objective list with
  locked/pending/completed indicators and completion counter.
- `components/exploration/InventoryPanel.jsx` — pack contents with resource
  icons and quantities.
- `components/exploration/AreaTransition.jsx` — animated "Now entering" caption.
- `pages/MissionPlay.jsx` — rewired to load the world from
  `GET /api/game/missions/:n/world`, show the story intro, render the
  exploration canvas, and handle terminal, flavour, transition and exit
  interactions through the world API.
- `index.css` — all `.ls-explore-*` styles for the canvas wrapper, D-pad,
  panels, prompts, area captions and story intro.

## Git workflow

1. Each branch was created from `main` (or from the previous merge point).
2. Work was committed with descriptive messages on the feature branch.
3. After completion, the branch was merged into `main` using `--no-ff` to
   preserve the branch history.
4. All branches and `main` were pushed to the GitHub remote.
5. No branch history was rewritten after pushing.

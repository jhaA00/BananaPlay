-- 001_survival.sql
-- Upgrades the original Banana Puzzle schema to The Last Signal.
-- Additive and safe to run against a database that already contains users,
-- games and rounds. Nothing is dropped or recreated.

ALTER TABLE games ADD COLUMN IF NOT EXISTS current_mission       SMALLINT NOT NULL DEFAULT 1;
ALTER TABLE games ADD COLUMN IF NOT EXISTS missions_completed    SMALLINT NOT NULL DEFAULT 0;
ALTER TABLE games ADD COLUMN IF NOT EXISTS outcome               VARCHAR(16);
ALTER TABLE games ADD COLUMN IF NOT EXISTS final_bonus_awarded   BOOLEAN  NOT NULL DEFAULT false;

ALTER TABLE rounds ADD COLUMN IF NOT EXISTS mission_number   SMALLINT;
ALTER TABLE rounds ADD COLUMN IF NOT EXISTS objective_key    VARCHAR(64);
ALTER TABLE rounds ADD COLUMN IF NOT EXISTS expires_at       TIMESTAMPTZ;
ALTER TABLE rounds ADD COLUMN IF NOT EXISTS points_awarded   SMALLINT NOT NULL DEFAULT 0;
ALTER TABLE rounds ADD COLUMN IF NOT EXISTS submitted_answer SMALLINT;

ALTER TABLE rounds DROP CONSTRAINT IF EXISTS rounds_status_check;
ALTER TABLE rounds
  ADD CONSTRAINT rounds_status_check
  CHECK (status IN ('open', 'correct', 'wrong', 'expired'));

ALTER TABLE games DROP CONSTRAINT IF EXISTS games_outcome_check;
ALTER TABLE games
  ADD CONSTRAINT games_outcome_check
  CHECK (outcome IS NULL OR outcome IN ('won', 'lost', 'abandoned'));

CREATE INDEX IF NOT EXISTS rounds_game_mission_idx ON rounds (game_id, mission_number);
CREATE INDEX IF NOT EXISTS rounds_expires_idx ON rounds (expires_at) WHERE status = 'open';

CREATE TABLE IF NOT EXISTS game_missions (
  id             SERIAL PRIMARY KEY,
  game_id        INTEGER     NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  mission_number SMALLINT    NOT NULL,
  status         VARCHAR(16) NOT NULL DEFAULT 'locked'
                   CHECK (status IN ('locked', 'available', 'in_progress', 'completed')),
  started_at     TIMESTAMPTZ,
  completed_at   TIMESTAMPTZ,
  UNIQUE (game_id, mission_number)
);

CREATE INDEX IF NOT EXISTS game_missions_game_idx ON game_missions (game_id, mission_number);

CREATE TABLE IF NOT EXISTS game_resources (
  game_id      INTEGER   NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  resource_key VARCHAR(32) NOT NULL,
  quantity     INTEGER   NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  PRIMARY KEY (game_id, resource_key)
);

CREATE TABLE IF NOT EXISTS user_achievements (
  user_id         INTEGER     NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  achievement_key VARCHAR(48) NOT NULL,
  game_id         INTEGER     REFERENCES games(id) ON DELETE SET NULL,
  awarded_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, achievement_key)
);

CREATE INDEX IF NOT EXISTS user_achievements_user_idx ON user_achievements (user_id, awarded_at);

CREATE TABLE IF NOT EXISTS game_events (
  id         BIGSERIAL PRIMARY KEY,
  user_id    INTEGER     NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  game_id    INTEGER     REFERENCES games(id) ON DELETE CASCADE,
  event_type VARCHAR(48) NOT NULL,
  payload    JSONB       NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS game_events_game_idx ON game_events (game_id, created_at);
CREATE INDEX IF NOT EXISTS game_events_user_idx ON game_events (user_id, created_at);

-- One-time transition: the old endless-run game cannot be mapped onto the new
-- mission structure without inventing progress. Preserve its score and history
-- by closing it as abandoned instead of deleting anything.
UPDATE games
   SET status      = 'finished',
       outcome     = 'abandoned',
       finished_at = now()
 WHERE status = 'active'
   AND outcome IS NULL;

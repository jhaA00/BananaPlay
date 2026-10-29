-- Banana Puzzle database schema.
-- Safe to run repeatedly: every statement is idempotent.

CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  username      VARCHAR(20)  NOT NULL UNIQUE,
  email         VARCHAR(255) NOT NULL UNIQUE,
  password_hash TEXT         NOT NULL,
  best_score    INTEGER      NOT NULL DEFAULT 0,
  total_score   INTEGER      NOT NULL DEFAULT 0,
  best_streak   INTEGER      NOT NULL DEFAULT 0,
  games_played  INTEGER      NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS games (
  id              SERIAL PRIMARY KEY,
  user_id         INTEGER     NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  score           INTEGER     NOT NULL DEFAULT 0,
  lives           INTEGER     NOT NULL DEFAULT 3 CHECK (lives BETWEEN 0 AND 3),
  streak          INTEGER     NOT NULL DEFAULT 0,
  max_streak      INTEGER     NOT NULL DEFAULT 0,
  correct_answers INTEGER     NOT NULL DEFAULT 0,
  hints_used      INTEGER     NOT NULL DEFAULT 0,
  status          VARCHAR(16) NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active', 'finished')),
  started_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at     TIMESTAMPTZ
);

-- A player can only have one run in progress at a time.
CREATE UNIQUE INDEX IF NOT EXISTS games_one_active_per_user
  ON games (user_id) WHERE status = 'active';

CREATE INDEX IF NOT EXISTS games_user_status_idx ON games (user_id, status);

CREATE TABLE IF NOT EXISTS rounds (
  id           SERIAL PRIMARY KEY,
  game_id      INTEGER     NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  question_url TEXT        NOT NULL,
  solution     INTEGER     NOT NULL,
  hint_used    BOOLEAN     NOT NULL DEFAULT false,
  status       VARCHAR(16) NOT NULL DEFAULT 'open'
                 CHECK (status IN ('open', 'correct', 'wrong')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  answered_at  TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS rounds_game_idx ON rounds (game_id);

-- Only one unanswered puzzle per run.
CREATE UNIQUE INDEX IF NOT EXISTS rounds_one_open_per_game
  ON rounds (game_id) WHERE status = 'open';

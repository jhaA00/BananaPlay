-- 002_exploration.sql
-- Adds the persisted 2D exploration state on top of the survival schema.
-- Every statement is additive and safe for existing users, games and rounds.

CREATE TABLE IF NOT EXISTS game_world_state (
  game_id        INTEGER     NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  mission_number SMALLINT    NOT NULL,
  area_key       VARCHAR(48) NOT NULL,
  player_x       NUMERIC(8, 2) NOT NULL DEFAULT 0,
  player_y       NUMERIC(8, 2) NOT NULL DEFAULT 0,
  facing         VARCHAR(8)  NOT NULL DEFAULT 'down',
  intro_seen     BOOLEAN     NOT NULL DEFAULT false,
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (game_id, mission_number)
);

CREATE TABLE IF NOT EXISTS game_objects (
  game_id        INTEGER     NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  mission_number SMALLINT    NOT NULL,
  object_key     VARCHAR(64) NOT NULL,
  status         VARCHAR(16) NOT NULL DEFAULT 'undiscovered'
                   CHECK (status IN (
                     'undiscovered', 'discovered', 'locked', 'available',
                     'in_progress', 'unlocked', 'collected', 'completed'
                   )),
  discovered_at  TIMESTAMPTZ,
  interacted_at  TIMESTAMPTZ,
  completed_at   TIMESTAMPTZ,
  PRIMARY KEY (game_id, mission_number, object_key)
);

CREATE INDEX IF NOT EXISTS game_objects_game_idx
  ON game_objects (game_id, mission_number);

CREATE TABLE IF NOT EXISTS game_objectives (
  game_id        INTEGER     NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  mission_number SMALLINT    NOT NULL,
  objective_key  VARCHAR(64) NOT NULL,
  status         VARCHAR(16) NOT NULL DEFAULT 'locked'
                   CHECK (status IN ('locked', 'pending', 'completed')),
  completed_at   TIMESTAMPTZ,
  PRIMARY KEY (game_id, mission_number, objective_key)
);

CREATE INDEX IF NOT EXISTS game_objectives_game_idx
  ON game_objectives (game_id, mission_number);

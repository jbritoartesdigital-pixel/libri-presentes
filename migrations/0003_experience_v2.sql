PRAGMA foreign_keys = ON;

ALTER TABLE events ADD COLUMN preview_token TEXT;
ALTER TABLE events ADD COLUMN onboarding_completed INTEGER NOT NULL DEFAULT 0;
ALTER TABLE events ADD COLUMN published_at TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_events_preview_token
  ON events(preview_token);
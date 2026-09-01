PRAGMA foreign_keys = ON;

ALTER TABLE events ADD COLUMN pix_city TEXT;
ALTER TABLE events ADD COLUMN completed_behavior TEXT NOT NULL DEFAULT 'show';
ALTER TABLE events ADD COLUMN reservation_hours INTEGER NOT NULL DEFAULT 48;
ALTER TABLE events ADD COLUMN share_description TEXT;
ALTER TABLE events ADD COLUMN client_access_created_at TEXT;

ALTER TABLE contributions ADD COLUMN guest_message TEXT;

ALTER TABLE reservations ADD COLUMN manage_token_hash TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_reservations_manage_token
  ON reservations(manage_token_hash);

CREATE INDEX IF NOT EXISTS idx_events_slug_status
  ON events(slug, status);

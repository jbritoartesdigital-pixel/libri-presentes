PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS events (
    id TEXT PRIMARY KEY,
    slug TEXT NOT NULL UNIQUE,
    event_name TEXT NOT NULL,
    client_name TEXT,

    event_type TEXT NOT NULL DEFAULT 'wedding'
        CHECK (event_type IN ('wedding','bridal_shower','housewarming','engagement','other')),

    event_date TEXT,

    status TEXT NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft','active','inactive')),

    public_title TEXT,
    intro TEXT,

    pix_key TEXT,
    pix_key_type TEXT
        CHECK (pix_key_type IS NULL OR pix_key_type IN ('cpf','cnpj','email','phone','random')),
    pix_holder_name TEXT,

    client_token_hash TEXT,

    experience_style TEXT NOT NULL DEFAULT 'home'
        CHECK (experience_style IN ('home','journey','classic')),

    primary_color TEXT NOT NULL DEFAULT '#6F6258',
    secondary_color TEXT NOT NULL DEFAULT '#D8CEC4',
    accent_color TEXT NOT NULL DEFAULT '#A8AD96',
    background_color TEXT NOT NULL DEFAULT '#F7F3EE',
    text_color TEXT NOT NULL DEFAULT '#2A2724',

    cover_path TEXT,
    preview_path TEXT,

    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS gifts (
    id TEXT PRIMARY KEY,
    event_id TEXT NOT NULL,

    title TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL DEFAULT 'Outros',

    gift_type TEXT NOT NULL DEFAULT 'quota'
        CHECK (gift_type IN ('quota','creative','experience','physical')),

    target_cents INTEGER NOT NULL DEFAULT 0 CHECK (target_cents >= 0),
    quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity >= 1),

    icon_name TEXT NOT NULL DEFAULT 'gift',
    preferred_color TEXT,
    image_path TEXT,

    allow_pix INTEGER NOT NULL DEFAULT 1 CHECK (allow_pix IN (0,1)),
    allow_physical INTEGER NOT NULL DEFAULT 0 CHECK (allow_physical IN (0,1)),
    is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0,1)),

    display_order INTEGER NOT NULL DEFAULT 0,

    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS contributions (
    id TEXT PRIMARY KEY,
    event_id TEXT NOT NULL,
    gift_id TEXT NOT NULL,

    guest_name TEXT NOT NULL,
    guest_contact TEXT NOT NULL,

    amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),

    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending','confirmed','rejected','cancelled')),

    payment_method TEXT NOT NULL DEFAULT 'pix'
        CHECK (payment_method IN ('pix')),

    declared_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    confirmed_at TEXT,
    rejected_at TEXT,
    cancelled_at TEXT,

    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
    FOREIGN KEY (gift_id) REFERENCES gifts(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS reservations (
    id TEXT PRIMARY KEY,
    event_id TEXT NOT NULL,
    gift_id TEXT NOT NULL,

    guest_name TEXT NOT NULL,
    guest_contact TEXT NOT NULL,

    status TEXT NOT NULL DEFAULT 'reserved'
        CHECK (status IN ('reserved','purchased','received','expired','cancelled')),

    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    purchased_at TEXT,
    received_at TEXT,
    cancelled_at TEXT,

    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
    FOREIGN KEY (gift_id) REFERENCES gifts(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS activity_log (
    id TEXT PRIMARY KEY,
    event_id TEXT NOT NULL,
    gift_id TEXT,
    contribution_id TEXT,
    reservation_id TEXT,

    actor_type TEXT NOT NULL
        CHECK (actor_type IN ('admin','client','guest','system')),

    action TEXT NOT NULL,
    detail TEXT,

    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
    FOREIGN KEY (gift_id) REFERENCES gifts(id) ON DELETE SET NULL,
    FOREIGN KEY (contribution_id) REFERENCES contributions(id) ON DELETE SET NULL,
    FOREIGN KEY (reservation_id) REFERENCES reservations(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_events_status
    ON events(status);

CREATE INDEX IF NOT EXISTS idx_gifts_event_order
    ON gifts(event_id, is_active, display_order);

CREATE INDEX IF NOT EXISTS idx_contributions_event_status
    ON contributions(event_id, status);

CREATE INDEX IF NOT EXISTS idx_contributions_gift_status
    ON contributions(gift_id, status);

CREATE INDEX IF NOT EXISTS idx_reservations_event_status
    ON reservations(event_id, status);

CREATE INDEX IF NOT EXISTS idx_reservations_gift_status
    ON reservations(gift_id, status);

CREATE INDEX IF NOT EXISTS idx_reservations_expires
    ON reservations(status, expires_at);

CREATE INDEX IF NOT EXISTS idx_activity_event_created
    ON activity_log(event_id, created_at DESC);

CREATE TRIGGER IF NOT EXISTS trg_events_updated_at
AFTER UPDATE ON events
FOR EACH ROW
BEGIN
    UPDATE events SET updated_at = CURRENT_TIMESTAMP WHERE id = OLD.id;
END;

CREATE TRIGGER IF NOT EXISTS trg_gifts_updated_at
AFTER UPDATE ON gifts
FOR EACH ROW
BEGIN
    UPDATE gifts SET updated_at = CURRENT_TIMESTAMP WHERE id = OLD.id;
END;

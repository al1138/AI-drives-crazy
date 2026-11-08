CREATE TABLE IF NOT EXISTS subscribers (
  email TEXT PRIMARY KEY COLLATE NOCASE,
  token TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  confirmed INTEGER NOT NULL DEFAULT 1,
  unsubscribed_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_subscribers_active
  ON subscribers (unsubscribed_at);

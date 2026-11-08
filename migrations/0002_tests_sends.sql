CREATE TABLE IF NOT EXISTS tests (
  id TEXT PRIMARY KEY,
  effect TEXT NOT NULL,
  title TEXT NOT NULL,
  blurb TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS subscriber_sends (
  email TEXT NOT NULL COLLATE NOCASE,
  test_id TEXT NOT NULL,
  sent_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (email, test_id)
);

INSERT OR IGNORE INTO tests (id, effect, title, blurb, sort_order, active) VALUES
  (
    'barnum-v1',
    'barnum',
    'Quel type es-tu vraiment ?',
    '10 questions. Réponds au feeling. On te dresse un profil.',
    1,
    1
  );

UPDATE tests
SET
  title = 'Le prof en vidéo',
  blurb = 'Tu vois un extrait. Tu juges. On compare à une vraie expérience de 1977.'
WHERE effect = 'halo';

INSERT OR IGNORE INTO tests (id, effect, title, blurb, sort_order, active) VALUES
  (
    'science-methode',
    'science',
    'La méthode qui se contredit',
    '8 questions. Pourquoi une étude peut être fausse… et pourquoi c’est une force.',
    7,
    1
  );

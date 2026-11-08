-- Quiz chiffres sourcés (remplace l’observatoire des coïncidences)
UPDATE tests
SET
  id = 'correlation-chiffres-sources',
  title = 'Chiffres & corrélations',
  blurb = '10 questions : chiffres sourcés + vraies corrélations étranges. Une seule réponse tient.'
WHERE effect = 'correlation' AND id = 'correlation-cafe-cosmic';

INSERT OR IGNORE INTO tests (id, effect, title, blurb, sort_order, active) VALUES
  (
    'correlation-chiffres-sources',
    'correlation',
    'Chiffres & corrélations',
    '10 questions : chiffres sourcés + vraies corrélations étranges. Une seule réponse tient.',
    3,
    1
  );

UPDATE tests
SET
  title = 'Chiffres & corrélations',
  blurb = '10 questions : chiffres sourcés + vraies corrélations étranges. Une seule réponse tient.'
WHERE effect = 'correlation' AND id = 'correlation-chiffres-sources';

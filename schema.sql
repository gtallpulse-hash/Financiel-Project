-- Opslag voor de synchronisatie (Cloudflare D1).
-- Per speler (afgeleid van de geheime sleutel) een rij per begrip of dag.
CREATE TABLE IF NOT EXISTS items (
  user TEXT NOT NULL,
  k TEXT NOT NULL,
  v TEXT NOT NULL,
  t INTEGER NOT NULL,
  u INTEGER NOT NULL,
  PRIMARY KEY (user, k)
);
CREATE INDEX IF NOT EXISTS items_user_u ON items (user, u);

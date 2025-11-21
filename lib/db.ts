import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';

let db: Database | null = null;

export async function getDb() {
  if (db) {
    return db;
  }

  db = await open({
    filename: './grid-game.db',
    driver: sqlite3.Database
  });

  await db.exec(`
    CREATE TABLE IF NOT EXISTS players (
      uuid TEXT PRIMARY KEY,
      last_login INTEGER,
      created_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS games (
      id TEXT PRIMARY KEY,
      room_id TEXT,
      host_uuid TEXT,
      guest_uuid TEXT,
      state TEXT,
      board_state TEXT,
      placed_mines TEXT,
      host_shapes TEXT,
      guest_shapes TEXT,
      placed_images TEXT,
      winner TEXT,
      created_at INTEGER,
      updated_at INTEGER,
      FOREIGN KEY(host_uuid) REFERENCES players(uuid),
      FOREIGN KEY(guest_uuid) REFERENCES players(uuid)
    );

    CREATE TABLE IF NOT EXISTS game_config (
      key TEXT PRIMARY KEY,
      value TEXT
    );
  `);

  // Insert default config if not exists
  const config = await db.get('SELECT * FROM game_config WHERE key = ?', 'default_config');
  if (!config) {
    await db.run('INSERT INTO game_config (key, value) VALUES (?, ?)', 'default_config', JSON.stringify({
      boardSize: 14,
      maxMines: 5
    }));
  }

  return db;
}

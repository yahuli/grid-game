import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import bcrypt from 'bcryptjs';

import fs from 'fs';

let db: Database | null = null;

export async function getDb() {
  if (db) {
    return db;
  }

  const dbPath = './grid-game.db';
  if (!fs.existsSync(dbPath)) {
    fs.writeFileSync(dbPath, '');
    console.log('Created new database file.');
  }

  db = await open({
    filename: dbPath,
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

    CREATE TABLE IF NOT EXISTS admins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE,
      password_hash TEXT,
      created_at INTEGER
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

  await initShapes(db);
  await initAdmins(db);

  return db;
}

async function initShapes(database: Database) {
  const shapesConfig = await database.get('SELECT * FROM game_config WHERE key = ?', 'default_shapes');
  if (!shapesConfig) {
    const defaultShapes = [
      [[1, 1], [1, 1]],
      [[1, 1, 1, 1]],
      [[1, 0, 0], [1, 1, 1]],
      [[0, 1, 0], [1, 1, 1]],
      [[0, 1, 1], [1, 1, 0]],
      [[1, 1, 0], [0, 1, 1]],
      [[1]],
    ];
    await database.run('INSERT INTO game_config (key, value) VALUES (?, ?)', 'default_shapes', JSON.stringify(defaultShapes));
    console.log('Default shapes initialized in config.');
  }
}

async function initAdmins(database: Database) {
  const admin = await database.get('SELECT * FROM admins WHERE username = ?', 'admin');
  if (!admin) {
    const hash = await bcrypt.hash('admin123', 10);
    await database.run('INSERT INTO admins (username, password_hash, created_at) VALUES (?, ?, ?)', 'admin', hash, Date.now());
    console.log('Default admin initialized.');
  }
}

export async function getShapes() {
  const database = await getDb();
  const config = await database.get('SELECT value FROM game_config WHERE key = ?', 'default_shapes');
  return config ? JSON.parse(config.value) : [];
}

export async function getAdminByUsername(username: string) {
  const database = await getDb();
  return database.get('SELECT * FROM admins WHERE username = ?', username);
}

export async function createAdmin(username: string, password: string) {
  const database = await getDb();
  const hash = await bcrypt.hash(password, 10);
  try {
    await database.run('INSERT INTO admins (username, password_hash, created_at) VALUES (?, ?, ?)', username, hash, Date.now());
    return true;
  } catch (e) {
    return false;
  }
}

export async function getAllAdmins() {
  const database = await getDb();
  return database.all('SELECT id, username, created_at FROM admins');
}

export async function deleteAdmin(id: number) {
  const database = await getDb();
  await database.run('DELETE FROM admins WHERE id = ?', id);
}

export async function changeAdminPassword(id: number, newPassword: string) {
  const database = await getDb();
  const hash = await bcrypt.hash(newPassword, 10);
  await database.run('UPDATE admins SET password_hash = ? WHERE id = ?', hash, id);
}

export async function getAllPlayers() {
  const database = await getDb();
  return database.all('SELECT uuid, last_login, created_at FROM players ORDER BY last_login DESC');
}

export async function deletePlayer(uuid: string) {
  const database = await getDb();
  await database.run('DELETE FROM players WHERE uuid = ?', uuid);
}

export async function updateConfig(key: string, value: any) {
  const database = await getDb();
  // Check if exists
  const existing = await database.get('SELECT key FROM game_config WHERE key = ?', key);
  if (existing) {
    await database.run('UPDATE game_config SET value = ? WHERE key = ?', JSON.stringify(value), key);
  } else {
    await database.run('INSERT INTO game_config (key, value) VALUES (?, ?)', key, JSON.stringify(value));
  }
}

export async function getConfig(key: string) {
  const database = await getDb();
  const res = await database.get('SELECT value FROM game_config WHERE key = ?', key);
  return res ? JSON.parse(res.value) : null;
}

export async function saveGame(game: any) {
  const database = await getDb();
  const now = Date.now();

  // Check if game exists
  const existing = await database.get('SELECT id FROM games WHERE room_id = ?', game.roomId);

  if (existing) {
    await database.run(`
      UPDATE games SET 
        host_uuid = ?, 
        guest_uuid = ?, 
        state = ?, 
        board_state = ?, 
        placed_mines = ?, 
        host_shapes = ?, 
        guest_shapes = ?, 
        placed_images = ?, 
        winner = ?, 
        updated_at = ?
      WHERE room_id = ?
    `,
      game.host,
      game.guest,
      game.gameState,
      JSON.stringify(game.board),
      JSON.stringify(game.placedMines),
      JSON.stringify(game.hostShapes),
      JSON.stringify(game.guestShapes),
      JSON.stringify(game.placedImages),
      game.winner,
      now,
      game.roomId
    );
  } else {
    await database.run(`
      INSERT INTO games (
        id, room_id, host_uuid, guest_uuid, state, board_state, 
        placed_mines, host_shapes, guest_shapes, placed_images, winner, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
      game.roomId, // Using roomId as ID for simplicity or generate a new UUID
      game.roomId,
      game.host,
      game.guest,
      game.gameState,
      JSON.stringify(game.board),
      JSON.stringify(game.placedMines),
      JSON.stringify(game.hostShapes),
      JSON.stringify(game.guestShapes),
      JSON.stringify(game.placedImages),
      game.winner,
      now,
      now
    );
  }
}

export async function loadGame(roomId: string) {
  const database = await getDb();
  const game = await database.get('SELECT * FROM games WHERE room_id = ?', roomId);

  if (!game) return null;

  return {
    roomId: game.room_id,
    host: game.host_uuid,
    guest: game.guest_uuid,
    gameState: game.state,
    board: JSON.parse(game.board_state),
    placedMines: JSON.parse(game.placed_mines),
    hostShapes: JSON.parse(game.host_shapes),
    guestShapes: JSON.parse(game.guest_shapes),
    placedImages: JSON.parse(game.placed_images),
    winner: game.winner
  };
}

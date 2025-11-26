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

    CREATE TABLE IF NOT EXISTS shapes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      shape_data TEXT,
      type TEXT DEFAULT 'host'
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

  return db;
}

async function initShapes(database: Database) {
  const count = await database.get('SELECT COUNT(*) as count FROM shapes');
  if (count.count === 0) {
    const defaultShapes = [
      [[1, 1], [1, 1]],
      [[1, 1, 1, 1]],
      [[1, 0, 0], [1, 1, 1]],
      [[0, 1, 0], [1, 1, 1]],
      [[0, 1, 1], [1, 1, 0]],
      [[1, 1, 0], [0, 1, 1]],
      [[1]],
    ];

    for (const shape of defaultShapes) {
      await database.run('INSERT INTO shapes (shape_data, type) VALUES (?, ?)', JSON.stringify(shape), 'host');
    }
    console.log('Default shapes initialized.');
  }
}

export async function getShapes() {
  const database = await getDb();
  const shapes = await database.all('SELECT shape_data FROM shapes WHERE type = ?', 'host');
  return shapes.map(s => JSON.parse(s.shape_data));
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

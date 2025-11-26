import { createServer } from "node:http";
import next from "next";
import { Server, Socket } from "socket.io";
import fs from 'fs';
import path from 'path';
import { getDb, saveGame, loadGame, getShapes } from './lib/db';

const dev = process.env.NODE_ENV !== "production";
const hostname = "0.0.0.0";
const port = 3000;

const app = next({ dev, hostname, port });
const handler = app.getRequestHandler();

const DEFAULT_BOARD_SIZE = 14;

// In-memory game state (still needed for active games, but backed by DB)
const games: Record<string, any> = {};

interface Shape {
    id?: string;
    src?: string;
    width?: number;
    height?: number;
    shape: number[][];
    instanceId?: string;
    rotation?: number;
    row?: number;
    col?: number;
}

interface GameState {
    roomId: string;
    host: string;
    guest: string | null;
    gameState: 'SETUP' | 'PLAY' | 'GAMEOVER';
    board: number[][];
    placedMines: any[];
    placedImages: any[];
    hostShapes: number[][][];
    guestShapes: Shape[];
    mineIdCounter: number;
    winner?: string;
}

function getShapeCells(shape: number[][], startRow: number, startCol: number) {
    const cells = [];
    for (let r = 0; r < shape.length; r++) {
        for (let c = 0; c < shape[r].length; c++) {
            if (shape[r][c] === 1) {
                cells.push({ r: startRow + r, c: startCol + c });
            }
        }
    }
    return cells;
}

function isOutOfBounds(r: number, c: number, rows: number, cols: number) {
    return r < 0 || r >= rows || c < 0 || c >= cols;
}

app.prepare().then(async () => {
    const httpServer = createServer(handler);
    const io = new Server(httpServer);

    // Initialize DB and Shapes
    try {
        await getDb();
        console.log("Database initialized");
    } catch (e) {
        console.error("Failed to init DB:", e);
    }

    io.on("connection", (socket: Socket) => {
        console.log('New client connected', socket.id);

        socket.on('create-room', async (data, callback) => {
            if (typeof data === 'function') { callback = data; data = {}; }
            let roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
            while (games[roomId]) {
                roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
            }
            const uuid = data.uuid;
            const rows = data.rows || DEFAULT_BOARD_SIZE;
            const cols = data.cols || DEFAULT_BOARD_SIZE;

            // Load shapes from DB
            let hostShapes = [];
            try {
                hostShapes = await getShapes();
            } catch (e) {
                console.error("Failed to load shapes from DB", e);
                // Fallback if DB fails? Or just empty.
            }

            games[roomId] = {
                roomId,
                host: uuid,
                guest: null,
                gameState: 'SETUP',
                board: Array(rows).fill(0).map(() => Array(cols).fill(0)),
                placedMines: [],
                placedImages: [],
                hostShapes: hostShapes,
                guestShapes: [],
                mineIdCounter: 0
            };

            socket.join(roomId);
            callback({ roomId, game: games[roomId] });
            console.log(`Room created: ${roomId} (${rows}x${cols})`);

            saveGame(games[roomId]);
        });

        socket.on('resize-board', async ({ roomId, rows, cols }) => {
            const game = games[roomId];
            if (!game || game.gameState !== 'SETUP') return;

            // Validate dimensions
            const newRows = Math.max(5, Math.min(30, rows));
            const newCols = Math.max(5, Math.min(30, cols));

            game.board = Array(newRows).fill(0).map(() => Array(newCols).fill(0));
            game.placedMines = []; // Clear mines on resize
            game.placedImages = [];

            // Reload shapes from DB to reset them
            try {
                game.hostShapes = await getShapes();
            } catch (e) {
                console.error("Failed to reload shapes", e);
            }

            io.to(roomId).emit('board-resized', {
                board: game.board,
                placedMines: game.placedMines,
                hostShapes: game.hostShapes
            });
            saveGame(game);
        });

        socket.on('join-room', async (data, callback) => {
            let roomId, uuid;
            if (typeof data === 'string') { roomId = data; }
            else { roomId = data.roomId; uuid = data.uuid; }

            let game = games[roomId];

            if (!game) {
                try {
                    const dbGame = await loadGame(roomId);
                    if (dbGame) {
                        game = {
                            ...dbGame,
                            mineIdCounter: dbGame.placedMines.length > 0 ? Math.max(...dbGame.placedMines.map((m: any) => m.id)) + 1 : 0
                        };
                        games[roomId] = game;
                        console.log(`Game restored from DB: ${roomId}`);
                    }
                } catch (e) {
                    console.error("Error loading game from DB", e);
                }
            }

            if (game) {
                // Check if room is full and user is not a participant
                if (game.host && game.guest && game.host !== uuid && game.guest !== uuid) {
                    callback({ success: false, error: 'Room is full' });
                    return;
                }

                socket.join(roomId);
                if (!game.host) game.host = uuid;
                else if (!game.guest && game.host !== uuid) {
                    game.guest = uuid;
                    saveGame(game);
                }

                callback({ success: true });
                console.log(`User joined room: ${roomId}`);
                socket.to(roomId).emit('player-joined', { uuid });
                socket.emit('game-state-sync', game);
            } else {
                callback({ success: false, error: 'Room not found' });
            }
        });

        socket.on('start-game', ({ roomId, placedMines, hostUuid }) => {
            const game = games[roomId];
            if (!game) return;
            if (game.host !== hostUuid) return;

            game.placedMines = placedMines;
            game.gameState = 'PLAY';

            const rows = game.board.length;
            const cols = game.board[0].length;

            game.placedMines.forEach((m: any) => {
                getShapeCells(m.shape, m.row, m.col).forEach(({ r, c }) => {
                    if (!isOutOfBounds(r, c, rows, cols)) game.board[r][c] = 1;
                });
            });

            io.to(roomId).emit('game-started', {
                placedMines: game.placedMines,
                guestShapes: game.guestShapes,
                hostUuid
            });

            saveGame(game);
        });

        socket.on('place-mine', ({ roomId, shape, row, col, isMove, mineId }) => {
            const game = games[roomId];
            if (!game || game.gameState !== 'SETUP') return;

            const rows = game.board.length;
            const cols = game.board[0].length;

            const cells = getShapeCells(shape, row, col);
            const canPlace = cells.every(({ r, c }) => {
                if (isOutOfBounds(r, c, rows, cols)) return false;
                return !game.placedMines.some((m: any) => {
                    if (isMove && m.id === mineId) return false;
                    const mCells = getShapeCells(m.shape, m.row, m.col);
                    return mCells.some(mc => mc.r === r && mc.c === c);
                });
            });

            if (canPlace) {
                if (!isMove) {
                    const shapeIndex = game.hostShapes.findIndex((s: any) => JSON.stringify(s) === JSON.stringify(shape));
                    if (shapeIndex !== -1) {
                        game.hostShapes.splice(shapeIndex, 1);
                    }
                }

                if (isMove && mineId !== undefined) {
                    game.placedMines = game.placedMines.filter((m: any) => m.id !== mineId);
                }
                const id = (isMove && mineId !== undefined) ? mineId : game.mineIdCounter++;
                game.placedMines.push({ id, shape, row, col });

                game.board = Array(rows).fill(0).map(() => Array(cols).fill(0));
                game.placedMines.forEach((m: any) => {
                    getShapeCells(m.shape, m.row, m.col).forEach(({ r, c }) => {
                        if (!isOutOfBounds(r, c, rows, cols)) game.board[r][c] = 1;
                    });
                });

                io.to(roomId).emit('mines-updated', {
                    placedMines: game.placedMines,
                    board: game.board,
                    hostShapes: game.hostShapes
                });
                saveGame(game);
            }
        });

        socket.on('place-shape', ({ roomId, shape, row, col }) => {
            console.log('place-shape received:', { roomId, shape, row, col });
            const game = games[roomId];
            if (!game || game.gameState !== 'PLAY') return;

            const rows = game.board.length;
            const cols = game.board[0].length;

            // shape is now an object for Guest: { shape: matrix, ... }
            const shapeMatrix = shape.shape || shape;

            const cells = getShapeCells(shapeMatrix, row, col);
            const canPlace = cells.every(({ r, c }) => {
                if (isOutOfBounds(r, c, rows, cols)) return false;
                const val = game.board[r][c];
                return val !== 2 && val !== 3;
            });

            if (!canPlace) {
                socket.emit('action-failed', { message: '无效操作' });
                return;
            }

            // Remove from guestShapes
            const shapeIndex = game.guestShapes.findIndex((s: any) => {
                if (s.instanceId && shape.instanceId) return s.instanceId === shape.instanceId;
                return JSON.stringify(s) === JSON.stringify(shape);
            });

            if (shapeIndex !== -1) {
                game.guestShapes.splice(shapeIndex, 1);
            }

            let hitMine = false;
            let hitMineId = null;

            for (const cell of cells) {
                const mine = game.placedMines.find((m: any) => {
                    const mCells = getShapeCells(m.shape, m.row, m.col);
                    return mCells.some(mc => mc.r === cell.r && mc.c === cell.c);
                });
                if (mine) {
                    hitMine = true;
                    hitMineId = mine.id;
                    break;
                }
            }

            // If it's an image shape AND no mine was hit, store it
            if (shape.src && !hitMine) {
                game.placedImages.push({
                    src: shape.src,
                    row,
                    col,
                    width: shape.width,
                    height: shape.height,
                    rotation: shape.rotation || 0,
                    id: Math.random().toString(36).substr(2, 9)
                });
            }

            if (hitMine && hitMineId !== null) {
                const mine = game.placedMines.find((m: any) => m.id === hitMineId);
                if (mine) {
                    getShapeCells(mine.shape, mine.row, mine.col).forEach(({ r, c }) => {
                        if (!isOutOfBounds(r, c, rows, cols)) game.board[r][c] = 3;
                    });
                }
            } else {
                cells.forEach(({ r, c }) => {
                    game.board[r][c] = 2;
                });
            }

            const totalCells = rows * cols;
            const mineSet = new Set();
            game.placedMines.forEach((m: any) => {
                getShapeCells(m.shape, m.row, m.col).forEach(({ r, c }) => mineSet.add(`${r},${c}`));
            });
            const mineCount = mineSet.size;
            let filledCount = 0;
            for (let r = 0; r < rows; r++) {
                for (let c = 0; c < cols; c++) {
                    if (game.board[r][c] === 2) filledCount++;
                }
            }
            const totalSafe = totalCells - mineCount;

            if (filledCount >= totalSafe) {
                game.gameState = 'GAMEOVER';
                game.winner = game.guest;
            }

            io.to(roomId).emit('board-updated', {
                board: game.board,
                guestShapes: game.guestShapes,
                placedImages: game.placedImages,
                lastMoveResult: hitMine ? 'BOOM' : 'OK',
                gameState: game.gameState,
                winner: game.winner
            });

            saveGame(game);
        });

        socket.on('give-shape', ({ roomId, shape }) => {
            const game = games[roomId];
            if (!game) return;

            const newShape = { ...shape, instanceId: Math.random().toString(36).substr(2, 9) };
            game.guestShapes.push(newShape);

            io.to(roomId).emit('shapes-updated', { guestShapes: game.guestShapes });
            saveGame(game);
        });

        socket.on('preview-shape', ({ roomId, previewCells }) => {
            socket.to(roomId).emit('opponent-preview', { previewCells });
        });

        socket.on('disconnect', () => {
            console.log('Client disconnected');
        });
    });

    httpServer
        .once("error", (err) => {
            console.error(err);
            process.exit(1);
        })
        .listen(port, () => {
            console.log(`> Ready on http://${hostname}:${port}`);
        });
});

import { createServer } from "node:http";
import next from "next";
import { Server } from "socket.io";
import fs from 'fs';
import path from 'path';

const dev = process.env.NODE_ENV !== "production";
const hostname = "0.0.0.0";
const port = 3000;

const app = next({ dev, hostname, port });
const handler = app.getRequestHandler();

const DEFAULT_BOARD_SIZE = 14;
const ALL_SHAPES = [
    [[1, 1], [1, 1]],
    [[1, 1, 1, 1]],
    [[1, 0, 0], [1, 1, 1]],
    [[0, 1, 0], [1, 1, 1]],
    [[0, 1, 1], [1, 1, 0]],
    [[1, 1, 0], [0, 1, 1]],
    [[1]],
];

let ALL_IMAGES = [];

// Load images on startup
try {
    const imageDir = path.join(process.cwd(), 'public/image');
    if (fs.existsSync(imageDir)) {
        const files = fs.readdirSync(imageDir);
        ALL_IMAGES = files.filter(file => /\.(png|jpg|jpeg|gif)$/i.test(file)).map(file => {
            const match = file.match(/(\d+)[xX](\d+)/);
            const width = match ? parseInt(match[1]) : 1;
            const height = match ? parseInt(match[2]) : 1;
            // Create a matrix of 1s based on dimensions
            const shapeMatrix = Array(height).fill(0).map(() => Array(width).fill(1));
            return {
                id: file, // Use filename as ID
                src: `/image/${file}`,
                width,
                height,
                shape: shapeMatrix
            };
        });
        console.log(`Loaded ${ALL_IMAGES.length} images.`);
    }
} catch (e) {
    console.error("Failed to load images:", e);
}

// In-memory game state
const games = {};

function getShapeCells(shape, startRow, startCol) {
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

function isOutOfBounds(r, c, rows, cols) {
    return r < 0 || r >= rows || c < 0 || c >= cols;
}

app.prepare().then(() => {
    const httpServer = createServer(handler);
    const io = new Server(httpServer);

    io.on("connection", (socket) => {
        console.log('New client connected', socket.id);

        socket.on('create-room', (data, callback) => {
            if (typeof data === 'function') { callback = data; data = {}; }
            let roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
            while (games[roomId]) {
                roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
            }
            const uuid = data.uuid;
            const rows = data.rows || DEFAULT_BOARD_SIZE;
            const cols = data.cols || DEFAULT_BOARD_SIZE;

            games[roomId] = {
                roomId,
                host: uuid,
                guest: null,
                gameState: 'SETUP',
                board: Array(rows).fill(0).map(() => Array(cols).fill(0)),
                placedMines: [],
                placedImages: [], // Track placed images
                hostShapes: [...ALL_SHAPES], // Host uses abstract shapes
                guestShapes: [], // Guest uses images
                mineIdCounter: 0
            };

            socket.join(roomId);
            callback(roomId);
            console.log(`Room created: ${roomId} (${rows}x${cols})`);

            saveGameToDb(games[roomId]);
        });

        socket.on('resize-board', ({ roomId, rows, cols }) => {
            const game = games[roomId];
            if (!game || game.gameState !== 'SETUP') return;

            // Validate dimensions
            const newRows = Math.max(5, Math.min(30, rows));
            const newCols = Math.max(5, Math.min(30, cols));

            game.board = Array(newRows).fill(0).map(() => Array(newCols).fill(0));
            game.placedMines = []; // Clear mines on resize
            game.placedImages = [];
            game.hostShapes = [...ALL_SHAPES]; // Reset shapes

            io.to(roomId).emit('board-resized', {
                board: game.board,
                placedMines: game.placedMines,
                hostShapes: game.hostShapes
            });
            saveGameToDb(game);
        });

        socket.on('join-room', async (data, callback) => {
            let roomId, uuid;
            if (typeof data === 'string') { roomId = data; }
            else { roomId = data.roomId; uuid = data.uuid; }

            let game = games[roomId];

            if (!game) {
                try {
                    const res = await fetch(`http://127.0.0.1:${port}/api/game/${roomId}`);
                    if (res.ok) {
                        const dbGame = await res.json();
                        game = {
                            roomId: dbGame.room_id,
                            host: dbGame.host,
                            guest: dbGame.guest,
                            gameState: dbGame.gameState,
                            board: dbGame.board,
                            placedMines: dbGame.placedMines,
                            placedImages: dbGame.placedImages || [],
                            hostShapes: dbGame.hostShapes || [...ALL_SHAPES],
                            guestShapes: dbGame.guestShapes || [],
                            mineIdCounter: dbGame.placedMines.length > 0 ? Math.max(...dbGame.placedMines.map(m => m.id)) + 1 : 0
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
                    saveGameToDb(game);
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
            game.placedMines = placedMines;
            // No default images for Guest. Host must give them.

            game.gameState = 'PLAY';

            const rows = game.board.length;
            const cols = game.board[0].length;

            game.placedMines.forEach(m => {
                getShapeCells(m.shape, m.row, m.col).forEach(({ r, c }) => {
                    if (!isOutOfBounds(r, c, rows, cols)) game.board[r][c] = 1;
                });
            });

            io.to(roomId).emit('game-started', {
                placedMines: game.placedMines,
                guestShapes: game.guestShapes,
                hostUuid
            });

            saveGameToDb(game);
        });

        socket.on('place-mine', ({ roomId, shape, row, col, isMove, mineId }) => {
            const game = games[roomId];
            if (!game || game.gameState !== 'SETUP') return;

            const rows = game.board.length;
            const cols = game.board[0].length;

            const cells = getShapeCells(shape, row, col);
            const canPlace = cells.every(({ r, c }) => {
                if (isOutOfBounds(r, c, rows, cols)) return false;
                return !game.placedMines.some(m => {
                    if (isMove && m.id === mineId) return false;
                    const mCells = getShapeCells(m.shape, m.row, m.col);
                    return mCells.some(mc => mc.r === r && mc.c === c);
                });
            });

            if (canPlace) {
                if (!isMove) {
                    const shapeIndex = game.hostShapes.findIndex(s => JSON.stringify(s) === JSON.stringify(shape));
                    if (shapeIndex !== -1) {
                        game.hostShapes.splice(shapeIndex, 1);
                    }
                }

                if (isMove && mineId !== undefined) {
                    game.placedMines = game.placedMines.filter(m => m.id !== mineId);
                }
                const id = (isMove && mineId !== undefined) ? mineId : game.mineIdCounter++;
                game.placedMines.push({ id, shape, row, col });

                game.board = Array(rows).fill(0).map(() => Array(cols).fill(0));
                game.placedMines.forEach(m => {
                    getShapeCells(m.shape, m.row, m.col).forEach(({ r, c }) => {
                        if (!isOutOfBounds(r, c, rows, cols)) game.board[r][c] = 1;
                    });
                });

                io.to(roomId).emit('mines-updated', {
                    placedMines: game.placedMines,
                    board: game.board,
                    hostShapes: game.hostShapes
                });
                saveGameToDb(game);
            }
        });

        socket.on('place-shape', ({ roomId, shape, row, col }) => {
            console.log('place-shape received:', { roomId, shape, row, col });
            const game = games[roomId];
            if (!game || game.gameState !== 'PLAY') return;

            const rows = game.board.length;
            const cols = game.board[0].length;

            // shape is now an object for Guest: { shape: matrix, ... }
            const shapeMatrix = shape.shape || shape; // Handle legacy or new structure

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
            // Identify by instanceId if available, or deep equality
            const shapeIndex = game.guestShapes.findIndex(s => {
                if (s.instanceId && shape.instanceId) return s.instanceId === shape.instanceId;
                return JSON.stringify(s) === JSON.stringify(shape);
            });

            if (shapeIndex !== -1) {
                game.guestShapes.splice(shapeIndex, 1);
            }

            let hitMine = false;
            let hitMineId = null;

            for (const cell of cells) {
                const mine = game.placedMines.find(m => {
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
                const mine = game.placedMines.find(m => m.id === hitMineId);
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
            game.placedMines.forEach(m => {
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

            saveGameToDb(game);
        });

        socket.on('give-shape', ({ roomId, shape }) => {
            const game = games[roomId];
            if (!game) return;

            // shape here is the image object from Host
            const newShape = { ...shape, instanceId: Math.random().toString(36).substr(2, 9) };
            game.guestShapes.push(newShape);

            io.to(roomId).emit('shapes-updated', { guestShapes: game.guestShapes });
            saveGameToDb(game);
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

async function saveGameToDb(game) {
    try {
        await fetch(`http://127.0.0.1:${port}/api/game/save`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                roomId: game.roomId,
                host: game.host,
                guest: game.guest,
                state: game.gameState,
                boardState: game.board,
                placedMines: game.placedMines,
                placedImages: game.placedImages,
                hostShapes: game.hostShapes,
                guestShapes: game.guestShapes,
                winner: game.winner
            })
        });
    } catch (e) {
        console.error("Failed to save game", e);
    }
}

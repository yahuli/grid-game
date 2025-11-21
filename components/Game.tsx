'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Board from './Board';
import ShapeSelector from './ShapeSelector';
import { socket } from '../app/socket';

const BOARD_SIZE = 14;

const ALL_SHAPES: number[][][] = [
    [[1, 1], [1, 1]],
    [[1, 1, 1, 1]],
    [[1, 0, 0], [1, 1, 1]],
    [[0, 1, 0], [1, 1, 1]],
    [[0, 1, 1], [1, 1, 0]],
    [[1, 1, 0], [0, 1, 1]],
    [[1]],
];

interface Mine {
    id: number;
    shape: number[][];
    row: number;
    col: number;
}

interface DraggedItem {
    shape: any; // number[][] or ImageShape
    player: 'HOST' | 'GUEST';
    isMove?: boolean;
    mineId?: number;
}

interface PreviewCell {
    r: number;
    c: number;
    status: 'ok' | 'bad';
}

interface ImageShape {
    id: string;
    src: string;
    width: number;
    height: number;
    shape: number[][];
    instanceId?: string;
    rotation?: number;
}

const rotateMatrix = (matrix: number[][]) => {
    const rows = matrix.length;
    const cols = matrix[0].length;
    const newMatrix = Array.from({ length: cols }, () => Array(rows).fill(0));
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            newMatrix[c][rows - 1 - r] = matrix[r][c];
        }
    }
    return newMatrix;
};

const Game: React.FC<{ playerUuid: string; initialGameId?: string }> = ({ playerUuid, initialGameId }) => {
    const [mounted, setMounted] = useState(false);
    const [isLobby, setIsLobby] = useState(true);
    const [roomId, setRoomId] = useState('');
    const [joinRoomId, setJoinRoomId] = useState('');
    const [isHost, setIsHost] = useState(false);
    const [opponentUuid, setOpponentUuid] = useState<string>('');

    const [board, setBoard] = useState<number[][]>(Array(BOARD_SIZE).fill(0).map(() => Array(BOARD_SIZE).fill(0)));
    const [gameState, setGameState] = useState<'SETUP' | 'PLAY' | 'GAMEOVER'>('SETUP');
    const [placedMines, setPlacedMines] = useState<Mine[]>([]);
    const [placedImages, setPlacedImages] = useState<any[]>([]);
    const [statusMessage, setStatusMessage] = useState<string>('Waiting to start...');

    const [hostShapes, setHostShapes] = useState<number[][][]>([...ALL_SHAPES]);
    const [guestShapes, setGuestShapes] = useState<any[]>([]);
    const [availableImages, setAvailableImages] = useState<ImageShape[]>([]);
    const [selectedImageToGive, setSelectedImageToGive] = useState<ImageShape | null>(null);

    const [draggedItem, setDraggedItem] = useState<DraggedItem | null>(null);
    const [previewCells, setPreviewCells] = useState<PreviewCell[]>([]);

    useEffect(() => {
        setMounted(true);
        // Fetch available images
        fetch('/api/images')
            .then(res => res.json())
            .then(data => setAvailableImages(data))
            .catch(err => console.error("Failed to load images", err));
    }, []);

    useEffect(() => {
        if (initialGameId && mounted) {
            setJoinRoomId(initialGameId);
            setTimeout(() => {
                socket.emit('join-room', { roomId: initialGameId, uuid: playerUuid }, (response: { success: boolean; error?: string }) => {
                    if (response.success) {
                        setRoomId(initialGameId);
                        setIsLobby(false);
                        setStatusMessage('重新加入游戏...');
                    } else {
                        alert(response.error);
                    }
                });
            }, 100);
        }
    }, [initialGameId, mounted, playerUuid]);

    useEffect(() => {
        if (!mounted || !socket) return;

        function onConnect() {
            console.log('Connected');
        }

        function onPlayerJoined({ uuid }: { uuid: string }) {
            if (isHost) {
                setOpponentUuid(uuid);
                setStatusMessage('玩家加入! 填充棋盘.');
            }
        }

        function onGameStateSync(game: any) {
            setBoard(game.board);
            setPlacedMines(game.placedMines);
            setPlacedImages(game.placedImages || []);
            setHostShapes(game.hostShapes || []);
            setGuestShapes(game.guestShapes || []);
            setGameState(game.gameState);

            if (game.host === playerUuid) {
                setIsHost(true);
            } else {
                setIsHost(false);
            }

            if (game.gameState === 'PLAY') {
                if (game.host === playerUuid) {
                    setStatusMessage("游戏开始! 观看玩家...");
                } else {
                    setStatusMessage("你的回合: 填充棋盘!");
                }
            }
        }

        function onGameStarted({ placedMines: remoteMines, guestShapes: remoteShapes, hostUuid }: any) {
            setPlacedMines(remoteMines);
            setGuestShapes(remoteShapes);
            setGameState('PLAY');
            if (playerUuid === hostUuid) {
                setStatusMessage("游戏开始! 观看玩家...");
            } else {
                setStatusMessage("你的回合: 填充棋盘!");
            }
        }

        function onMinesUpdated({ placedMines: newMines, board: newBoard, hostShapes: newShapes }: any) {
            setPlacedMines(newMines);
            setBoard(newBoard);
            if (newShapes) setHostShapes(newShapes);
        }

        function onBoardUpdated({ board: newBoard, guestShapes: newShapes, placedImages: newImages, lastMoveResult, gameState: newState, winner }: any) {
            setBoard(newBoard);
            setGuestShapes(newShapes);
            if (newImages) setPlacedImages(newImages);
            setGameState(newState);

            if (lastMoveResult === 'BOOM') {
                setStatusMessage("BOOM! 触发地雷!");
            } else {
                setStatusMessage("填充成功!");
            }

            if (newState === 'GAMEOVER') {
                setStatusMessage(winner === playerUuid ? "胜利! 棋盘填充完毕!" : "失败! 玩家获胜!");
            }
        }

        function onShapesUpdated({ guestShapes: newShapes }: any) {
            setGuestShapes(newShapes);
            if (!isHost) setStatusMessage("房主发送了一个新物品!");
        }

        function onActionFailed({ message }: { message: string }) {
            alert(message);
        }

        function onOpponentPreview({ previewCells }: { previewCells: PreviewCell[] }) {
            setPreviewCells(previewCells);
        }

        function onBoardResized({ board, placedMines, hostShapes }: { board: number[][], placedMines: any[], hostShapes: any[] }) {
            setBoard(board);
            setPlacedMines(placedMines);
            setHostShapes(hostShapes);
            setPlacedImages([]); // Clear images on resize
        }

        socket.on('connect', onConnect);
        socket.on('player-joined', onPlayerJoined);
        socket.on('game-state-sync', onGameStateSync);
        socket.on('game-started', onGameStarted);
        socket.on('mines-updated', onMinesUpdated);
        socket.on('board-updated', onBoardUpdated);
        socket.on('shapes-updated', onShapesUpdated);
        socket.on('action-failed', onActionFailed);
        socket.on('opponent-preview', onOpponentPreview);
        socket.on('board-resized', onBoardResized);

        return () => {
            socket.off('connect', onConnect);
            socket.off('player-joined', onPlayerJoined);
            socket.off('game-state-sync', onGameStateSync);
            socket.off('game-started', onGameStarted);
            socket.off('mines-updated', onMinesUpdated);
            socket.off('board-updated', onBoardUpdated);
            socket.off('shapes-updated', onShapesUpdated);
            socket.off('action-failed', onActionFailed);
            socket.off('opponent-preview', onOpponentPreview);
            socket.off('board-resized', onBoardResized);
        };
    }, [isHost, mounted, playerUuid]);

    const getShapeCells = (shape: any, startRow: number, startCol: number) => {
        const cells: { r: number; c: number }[] = [];
        const matrix = shape.shape || shape; // Handle object or array
        for (let r = 0; r < matrix.length; r++) {
            for (let c = 0; c < matrix[r].length; c++) {
                if (matrix[r][c] === 1) {
                    cells.push({ r: startRow + r, c: startCol + c });
                }
            }
        }
        return cells;
    };

    const isOutOfBounds = (r: number, c: number) => {
        return r < 0 || r >= board.length || c < 0 || c >= (board[0]?.length || 0);
    };



    const createRoom = () => {
        socket.emit('create-room', { uuid: playerUuid }, (id: string) => {
            setRoomId(id);
            setIsHost(true);
            setIsLobby(false);
            setStatusMessage('等待玩家加入...');
        });
    };

    const joinRoom = () => {
        if (!joinRoomId) return;
        socket.emit('join-room', { roomId: joinRoomId, uuid: playerUuid }, (response: { success: boolean; error?: string }) => {
            if (response.success) {
                setRoomId(joinRoomId);
                setIsLobby(false);
                setStatusMessage('正在加入...');
            } else {
                alert(response.error);
            }
        });
    };

    const onDragOver = (e: React.DragEvent<HTMLDivElement>, row: number, col: number) => {
        e.preventDefault();
        if (!draggedItem) return;

        const { shape, player } = draggedItem;

        if (isHost && gameState !== 'SETUP') return;
        if (!isHost && gameState !== 'PLAY') return;
        if (isHost && player !== 'HOST') return;
        if (!isHost && player !== 'GUEST') return;

        const cells = getShapeCells(shape, row, col);
        const canPlace = cells.every(({ r, c }) => !isOutOfBounds(r, c));
        const newPreviewCells = cells.map(c => ({ ...c, status: canPlace ? 'ok' : 'bad' } as PreviewCell));

        setPreviewCells(newPreviewCells);
        if (!isHost) {
            socket.emit('preview-shape', { roomId, previewCells: newPreviewCells });
        }
    };

    const onDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
        setPreviewCells([]);
        if (!isHost) {
            socket.emit('preview-shape', { roomId, previewCells: [] });
        }
    };

    const onDrop = (e: React.DragEvent<HTMLDivElement>, row: number, col: number) => {
        e.preventDefault();
        setPreviewCells([]);
        if (!isHost) {
            socket.emit('preview-shape', { roomId, previewCells: [] });
        }

        if (!draggedItem) return;
        const { shape, player, isMove, mineId } = draggedItem;

        if (isHost && player !== 'HOST') return;
        if (!isHost && player !== 'GUEST') return;

        if (player === 'HOST') {
            socket.emit('place-mine', { roomId, shape, row, col, isMove, mineId });
        } else {
            socket.emit('place-shape', { roomId, shape, row, col });
        }

        setDraggedItem(null);
    };

    const giveShapeToGuest = () => {
        if (!selectedImageToGive) {
            alert("请先选择一个物品!");
            return;
        }
        socket.emit('give-shape', { roomId, shape: selectedImageToGive });
        setSelectedImageToGive(null);
    };

    const startGame = () => {
        if (placedMines.length === 0) {
            alert("请至少放置一个地雷!");
            return;
        }
        // Host doesn't send shapes anymore, server handles it
        socket.emit('start-game', {
            roomId,
            placedMines,
            hostUuid: playerUuid
        });
    };

    const handleRotateShape = (index: number) => {
        if (isHost) return;
        const newShapes = [...guestShapes];
        const shape = newShapes[index];

        // Rotate the matrix
        const newMatrix = rotateMatrix(shape.shape);

        // Update rotation angle
        const currentRotation = shape.rotation || 0;
        const newRotation = (currentRotation + 90) % 360;

        // Swap width/height
        const newWidth = shape.height;
        const newHeight = shape.width;

        newShapes[index] = {
            ...shape,
            shape: newMatrix,
            width: newWidth,
            height: newHeight,
            rotation: newRotation
        };

        setGuestShapes(newShapes);
    };

    if (!mounted) return null;

    if (isLobby) {
        return (
            <div className="lobby-container" style={{ textAlign: 'center', marginTop: '50px' }}>
                <h1>排雷游戏</h1>
                <div style={{ marginBottom: '20px' }}>
                    <button className="btn-primary" onClick={createRoom}>创建游戏 (房主)</button>
                </div>
                <div>
                    <input
                        type="text"
                        placeholder="输入房间号"
                        value={joinRoomId}
                        onChange={(e) => setJoinRoomId(e.target.value)}
                        style={{ padding: '10px', marginRight: '10px', color: 'black' }}
                    />
                    <button className="btn-primary" onClick={joinRoom}>加入游戏</button>
                </div>
            </div>
        );
    }

    return (
        <div className="game-container">
            <div className="status-bar-container">
                <h3>房间号: {roomId} | 你是: {isHost ? '房主' : '玩家'}</h3>
                <div className="game-status">{statusMessage}</div>
            </div>

            <div className="game-layout">
                <div className={`panel player-panel left-panel ${!isHost ? 'disabled' : ''}`}>
                    <div className="panel-header">
                        <h2>房主</h2>
                        <div className="player-badge">{isHost ? '(你)' : '(对手)'}</div>
                    </div>

                    {gameState === 'SETUP' && isHost && (
                        <div className="panel-content">
                            <div className="section">
                                <h3>棋盘大小</h3>
                                <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
                                    <label>
                                        行:
                                        <input
                                            type="number"
                                            min="5"
                                            max="30"
                                            value={board.length}
                                            onChange={(e) => {
                                                const rows = parseInt(e.target.value);
                                                if (rows >= 5 && rows <= 30) {
                                                    socket.emit('resize-board', { roomId, rows, cols: board[0].length });
                                                }
                                            }}
                                            style={{ width: '50px', marginLeft: '5px', padding: '4px', borderRadius: '4px', border: '1px solid #555', background: '#222', color: 'white' }}
                                        />
                                    </label>
                                    <label>
                                        列:
                                        <input
                                            type="number"
                                            min="5"
                                            max="30"
                                            value={board[0]?.length || 14}
                                            onChange={(e) => {
                                                const cols = parseInt(e.target.value);
                                                if (cols >= 5 && cols <= 30) {
                                                    socket.emit('resize-board', { roomId, rows: board.length, cols });
                                                }
                                            }}
                                            style={{ width: '50px', marginLeft: '5px', padding: '4px', borderRadius: '4px', border: '1px solid #555', background: '#222', color: 'white' }}
                                        />
                                    </label>
                                </div>
                            </div>

                            <p className="instruction">请放置地雷.</p>
                            <ShapeSelector
                                shapes={hostShapes}
                                player="HOST"
                                onShapeDragStart={setDraggedItem}
                            />
                            <button className="btn-primary" onClick={startGame}>开始游戏</button>
                        </div>
                    )}

                    {gameState === 'PLAY' && isHost && (
                        <div className="panel-content">
                            <div className="section">
                                <h3>玩家的物品</h3>
                                <div className="shapes-grid">
                                    {guestShapes.length === 0 && <p className="empty-text">没有物品</p>}
                                    {guestShapes.map((shape, idx) => (
                                        <div key={idx} className="mini-shape">
                                            <img src={shape.src} alt="shape" />
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="section">
                                <h3>发送物品</h3>
                                <div className="image-selector">
                                    {availableImages.sort((a, b) => a.width - b.width || a.height - b.height).map((img, idx) => (
                                        <div
                                            key={idx}
                                            className={`image-option ${selectedImageToGive === img ? 'selected' : ''}`}
                                            onClick={() => setSelectedImageToGive(img)}
                                        >
                                            <img src={img.src} alt={img.id} />
                                            <span>{img.width}x{img.height}</span>
                                        </div>
                                    ))}
                                </div>
                                <button className="btn-primary" onClick={giveShapeToGuest}>发送</button>
                            </div>
                        </div>
                    )}
                    {!isHost && <div className="waiting-message"><p>等待房主发送物品...</p></div>}
                </div>

                <div className="board-section">
                    <div className="board-wrapper">
                        <Board
                            board={board}
                            placedImages={placedImages}
                            isMineHidden={isHost ? gameState === 'PLAY' : gameState !== 'GAMEOVER'}
                            previewCells={previewCells}
                            onDrop={onDrop}
                            onDragOver={onDragOver}
                            onDragLeave={onDragLeave}
                            onMouseDown={(e, r, c) => {
                                if (isHost && gameState === 'SETUP' && board[r][c] === 1) {
                                    const mine = placedMines.find(m => {
                                        const cells = getShapeCells(m.shape, m.row, m.col);
                                        return cells.some(cell => cell.r === r && cell.c === c);
                                    });
                                    if (mine) {
                                        setDraggedItem({
                                            shape: mine.shape,
                                            player: 'HOST',
                                            isMove: true,
                                            mineId: mine.id
                                        });
                                    }
                                }
                            }}
                        />
                    </div>
                </div>

                <div className={`panel player-panel right-panel ${isHost ? 'disabled' : ''}`}>
                    <div className="panel-header">
                        <h2>玩家</h2>
                        <div className="player-badge">{!isHost ? '(你)' : '(对手)'}</div>
                    </div>

                    <div className="panel-content">
                        {gameState === 'PLAY' && !isHost && (
                            <ShapeSelector
                                shapes={guestShapes}
                                player="GUEST"
                                onShapeDragStart={setDraggedItem}
                                onRotateShape={handleRotateShape}
                            />
                        )}
                        {gameState === 'GAMEOVER' && (
                            <div className="game-over">
                                <h3>游戏结束</h3>
                                <p>{statusMessage}</p>
                                <button className="btn-primary" onClick={() => window.location.reload()}>重新开始</button>
                            </div>
                        )}
                        {isHost && gameState === 'PLAY' && <div className="watching-message"><p>等待玩家操作...</p></div>}
                        {!isHost && gameState !== 'GAMEOVER' && <p className="status-text">{statusMessage}</p>}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Game;

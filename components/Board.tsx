import React from 'react';
import Cell from './Cell';

interface PreviewCell {
    r: number;
    c: number;
    status: 'ok' | 'bad';
}

interface PlacedImage {
    id: string;
    src: string;
    row: number;
    col: number;
    width: number;
    height: number;
    rotation?: number;
}

interface BoardProps {
    board: number[][];
    placedImages?: PlacedImage[];
    isMineHidden: boolean;
    previewCells: PreviewCell[];
    onDrop: (e: React.DragEvent<HTMLDivElement>, row: number, col: number) => void;
    onDragOver: (e: React.DragEvent<HTMLDivElement>, row: number, col: number) => void;
    onDragLeave: (e: React.DragEvent<HTMLDivElement>) => void;
    onMouseDown: (e: React.MouseEvent<HTMLDivElement>, row: number, col: number) => void;
}

const Board: React.FC<BoardProps> = ({
    board,
    placedImages = [],
    isMineHidden,
    previewCells,
    onDrop,
    onDragOver,
    onDragLeave,
    onMouseDown,
}) => {
    const rows = board.length;
    const cols = board[0]?.length || 0;

    return (
        <div
            className="game-board"
            id="game-board"
            style={{
                position: 'relative',
                gridTemplateRows: `repeat(${rows}, 35px)`,
                gridTemplateColumns: `repeat(${cols}, 35px)`
            }}
        >
            {board.map((row, r) => (
                row.map((cellValue, c) => {
                    const preview = previewCells.find(p => p.r === r && p.c === c);
                    return (
                        <Cell
                            key={`${r}-${c}`}
                            row={r}
                            col={c}
                            value={cellValue}
                            isMineHidden={isMineHidden}
                            previewState={preview ? preview.status : null}
                            onDrop={onDrop}
                            onDragOver={onDragOver}
                            onDragLeave={onDragLeave}
                            onMouseDown={onMouseDown}
                        />
                    );
                })
            ))}

            {/* Render placed images overlay */}
            {placedImages.map((img) => {
                console.log('Rendering image:', img);
                const rotation = img.rotation || 0;
                // img.width/height are the occupied grid dimensions
                const gridWidthPx = img.width * 35 + (img.width - 1) * 2;
                const gridHeightPx = img.height * 35 + (img.height - 1) * 2;

                // If rotated 90/270, the image element's width/height should be swapped relative to grid box
                // But wait, if I rotate a 2x1 image 90deg, it becomes 1x2 on grid.
                // Grid box is 1x2 (tall).
                // Image element should be 2x1 (wide) and then rotated.
                // So imgWidthPx should be gridHeightPx? No.
                // Grid Height (2 units) corresponds to Image Width (2 units).
                // So imgWidthPx = gridHeightPx.

                const isRotated = rotation === 90 || rotation === 270;
                const imgWidthPx = isRotated ? gridHeightPx : gridWidthPx;
                const imgHeightPx = isRotated ? gridWidthPx : gridHeightPx;

                const dx = (gridWidthPx - imgWidthPx) / 2;
                const dy = (gridHeightPx - imgHeightPx) / 2;

                return (
                    <img
                        key={img.id}
                        src={img.src}
                        alt="placed shape"
                        style={{
                            position: 'absolute',
                            left: `${2 + img.col * 37 + dx}px`,
                            top: `${2 + img.row * 37 + dy}px`,
                            width: `${imgWidthPx}px`,
                            height: `${imgHeightPx}px`,
                            transform: `rotate(${rotation}deg)`,
                            pointerEvents: 'none',
                            opacity: 1,
                            zIndex: 5
                        }}
                    />
                );
            })}
        </div>
    );
};

export default Board;

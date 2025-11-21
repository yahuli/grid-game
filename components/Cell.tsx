import React from 'react';

interface CellProps {
    row: number;
    col: number;
    value: number; // 0: Empty, 1: Mine, 2: Filled, 3: Exploded
    isMineHidden: boolean;
    previewState?: 'ok' | 'bad' | null;
    onDrop: (e: React.DragEvent<HTMLDivElement>, row: number, col: number) => void;
    onDragOver: (e: React.DragEvent<HTMLDivElement>, row: number, col: number) => void;
    onDragLeave: (e: React.DragEvent<HTMLDivElement>) => void;
    onMouseDown: (e: React.MouseEvent<HTMLDivElement>, row: number, col: number) => void;
}

const Cell: React.FC<CellProps> = ({
    row,
    col,
    value,
    isMineHidden,
    previewState,
    onDrop,
    onDragOver,
    onDragLeave,
    onMouseDown,
}) => {
    let className = 'cell';

    if (value === 1) {
        className += isMineHidden ? '' : ' mine-placed';
    } else if (value === 2) {
        className += ' filled-guest';
    } else if (value === 3) {
        className += ' triggered';
    }

    if (previewState === 'ok') {
        className += ' preview-ok';
    } else if (previewState === 'bad') {
        className += ' preview-bad';
    }

    return (
        <div
            className={className}
            data-row={row}
            data-col={col}
            onDrop={(e) => onDrop(e, row, col)}
            onDragOver={(e) => onDragOver(e, row, col)}
            onDragLeave={onDragLeave}
            onMouseDown={(e) => onMouseDown(e, row, col)}
        />
    );
};

export default Cell;

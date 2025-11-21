import React from 'react';

interface DraggableShapeProps {
    shape: any; // Can be number[][] or ImageShape object
    player: 'HOST' | 'GUEST';
    mineId?: number;
    isMove?: boolean;
    onShapeDragStart?: (item: { shape: any; player: 'HOST' | 'GUEST'; mineId?: number; isMove?: boolean }) => void;
    onRotate?: () => void;
    disabled?: boolean;
}

const DraggableShape: React.FC<DraggableShapeProps> = ({ shape, player, mineId, isMove = false, onShapeDragStart, onRotate, disabled }) => {
    // Check if shape is an image object
    const isImage = shape && shape.src;
    const shapeMatrix = isImage ? shape.shape : shape;

    const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
        if (disabled) {
            e.preventDefault();
            return;
        }

        const data = {
            shape,
            player,
            isMove,
            mineId,
        };
        // We still set dataTransfer for standard DnD
        e.dataTransfer.setData('application/json', JSON.stringify(data));
        e.dataTransfer.effectAllowed = 'move';

        const target = e.target as HTMLElement;
        target.classList.add('dragging');

        if (onShapeDragStart) {
            onShapeDragStart({ shape, player, mineId, isMove });
        }
    };

    const handleDragEnd = (e: React.DragEvent<HTMLDivElement>) => {
        const target = e.target as HTMLElement;
        target.classList.remove('dragging');
    };

    return (
        <div
            className={`shape-container ${disabled ? 'disabled' : ''}`}
            draggable={!disabled}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            style={{
                opacity: disabled ? 0.5 : 1,
                cursor: disabled ? 'not-allowed' : 'grab',
                border: isImage ? '1px solid #444' : 'none',
                padding: isImage ? '5px' : '8px',
                position: 'relative'
            }}
        >
            {isImage ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{
                        position: 'relative',
                        transform: `rotate(${shape.rotation || 0}deg)`,
                        transition: 'transform 0.3s ease'
                    }}>
                        <img
                            src={shape.src}
                            alt="Game Piece"
                            style={{
                                width: `${(shape.rotation === 90 || shape.rotation === 270 ? shape.height : shape.width) * 20}px`, // Visual width depends on rotation
                                height: `${(shape.rotation === 90 || shape.rotation === 270 ? shape.width : shape.height) * 20}px`,
                                objectFit: 'contain',
                                imageRendering: 'pixelated'
                            }}
                            draggable={false}
                        />
                    </div>
                    <div style={{ fontSize: '10px', marginTop: '4px', color: '#aaa', display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <span>{shape.width}x{shape.height}</span>
                        {onRotate && !disabled && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    e.preventDefault();
                                    onRotate();
                                }}
                                style={{
                                    background: 'rgba(255, 255, 255, 0.1)',
                                    border: '1px solid rgba(255, 255, 255, 0.2)',
                                    borderRadius: '50%',
                                    width: '20px',
                                    height: '20px',
                                    display: 'flex',
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                    cursor: 'pointer',
                                    color: 'white',
                                    fontSize: '12px',
                                    padding: 0
                                }}
                                title="Rotate"
                            >
                                ↻
                            </button>
                        )}
                    </div>
                </div>
            ) : (
                <div
                    style={{
                        display: 'grid',
                        gridTemplateRows: `repeat(${shapeMatrix.length}, 15px)`,
                        gridTemplateColumns: `repeat(${shapeMatrix[0].length}, 15px)`,
                        gap: '1px',
                    }}
                >
                    {shapeMatrix.map((row: number[], rIndex: number) =>
                        row.map((cell: number, cIndex: number) => (
                            <div
                                key={`${rIndex}-${cIndex}`}
                                className={cell ? (player === 'HOST' ? 'shape-block' : 'fill-block') : ''}
                            />
                        ))
                    )}
                </div>
            )}
        </div>
    );
};

export default DraggableShape;

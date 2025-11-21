import React from 'react';
import DraggableShape from './DraggableShape';

interface ShapeSelectorProps {
    shapes: any[]; // Can be number[][][] or ImageShape[]
    player: 'HOST' | 'GUEST';
    onShapeDragStart: (item: { shape: any; player: 'HOST' | 'GUEST'; mineId?: number; isMove?: boolean }) => void;
    onRotateShape?: (index: number) => void;
}

const ShapeSelector: React.FC<ShapeSelectorProps> = ({ shapes, player, onShapeDragStart, onRotateShape }) => {
    return (
        <div className="shape-selector">
            {shapes.map((shape, index) => (
                <DraggableShape
                    key={index}
                    shape={shape}
                    player={player}
                    onShapeDragStart={onShapeDragStart}
                    onRotate={onRotateShape ? () => onRotateShape(index) : undefined}
                />
            ))}
        </div>
    );
};

export default ShapeSelector;

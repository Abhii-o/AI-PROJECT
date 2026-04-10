import React from 'react';
import './LegoBlock.css';

export default function LegoBlock({ 
  type, 
  state, // visited, frontier, path, null
  onMouseDown, 
  onMouseEnter, 
  onMouseUp 
}) {
  return (
    <div 
      className="lego-block-wrapper"
      onMouseDown={onMouseDown}
      onMouseEnter={onMouseEnter}
      onMouseUp={onMouseUp}
      onDragStart={(e) => e.preventDefault()}
    >
      <div className={`lego-block block-type-${type}`}>
        {/* Render overlay if search state exists and block isn't a wall */}
        {state && type !== 'wall' && (
          <div className={`overlay ${state}`} />
        )}
      </div>
    </div>
  );
}

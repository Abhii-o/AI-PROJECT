import React, { useEffect, useCallback } from 'react';
import './LegoGrid.css';
import LegoBlock from './LegoBlock';
import { useLegoSandbox } from '../hooks/useLegoSandbox';
import { getCost } from '../algorithms/legoSearch';

export default function LegoGrid({ 
  rows, 
  cols, 
  gridConfig, // map of "r,c" -> blockType string
  startPos, // {r, c}
  goalPos,  // {r, c}
  algorithm,
  isPlaying,
  speed,
  mode, // 'build', 'solve', 'challenge'
  onBlockInteract, // (r, c) => void
  onGlobalLog // Optional: to bubble logs up to global XAIPanel
}) {

  // Helper for Search
  const isGoal = useCallback((state) => {
    const [r, c] = state.split(',').map(Number);
    return r === goalPos.r && c === goalPos.c;
  }, [goalPos]);

  const getNeighbors = useCallback((state) => {
    const [r, c] = state.split(',').map(Number);
    const neighbors = [];
    const dirs = [[0, 1], [1, 0], [0, -1], [-1, 0]];
    
    for (const [dr, dc] of dirs) {
      const nr = r + dr;
      const nc = c + dc;
      if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
        const id = `${nr},${nc}`;
        const type = gridConfig.get(id) || 'empty';
        if (type !== 'wall') {
          neighbors.push({ state: id, cost: getCost(type), type });
        }
      }
    }
    return neighbors;
  }, [rows, cols, gridConfig]);

  const heuristic = useCallback((state) => {
    const [r, c] = state.split(',').map(Number);
    // Manhattan distance scaled by minimum cost (1) to remain admissible
    return (Math.abs(r - goalPos.r) + Math.abs(c - goalPos.c)) * 1;
  }, [goalPos]);

  const handleReset = useCallback(() => {
    // Optional internal reset hook
  }, []);

  const sandbox = useLegoSandbox({ isGoal, getNeighbors, heuristic, onReset: handleReset });
  const { initSearch, play, pause, status, xaiLogs } = sandbox;

  // React to external Play/Pause
  useEffect(() => {
    if (mode === 'build') return; // Do not execute during build mode
    
    if (isPlaying) {
      if (status === 'idle') {
        initSearch(`${startPos.r},${startPos.c}`, algorithm);
        play(speed);
      } else {
        play(speed);
      }
    } else {
      pause();
    }
  }, [isPlaying, mode, speed, algorithm, status, startPos]);

  // Push latest log to global panel if provided
  useEffect(() => {
    if (onGlobalLog && xaiLogs.length > 0) {
      onGlobalLog(algorithm, xaiLogs[xaiLogs.length - 1]);
    }
  }, [xaiLogs, algorithm, onGlobalLog]);

  // Reset if grid changes deeply while not playing
  useEffect(() => {
      initSearch(`${startPos.r},${startPos.c}`, algorithm);
  }, [gridConfig, startPos, goalPos, algorithm, initSearch]);

  // Build mode interact handlers
  const handleMouseDown = (r, c) => {
    if (mode === 'build') onBlockInteract(r, c, false);
  };
  
  const handleMouseEnter = (r, c, e) => {
    if (mode === 'build' && e.buttons === 1) { // Left mouse button down
      onBlockInteract(r, c, true);
    }
  };

  const cells = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const id = `${r},${c}`;
      let type = gridConfig.get(id) || 'empty';
      let state = null; // overlay state

      if (r === startPos.r && c === startPos.c) {
          type = 'start';
      } else if (r === goalPos.r && c === goalPos.c) {
          type = 'goal';
      } else {
          // If the grid state implies something else, keep going.
      }

      if (sandbox.gridOverlay.has(id)) {
          state = sandbox.gridOverlay.get(id);
      }

      cells.push(
        <LegoBlock 
          key={id}
          type={type}
          state={state}
          onMouseDown={() => handleMouseDown(r, c)}
          onMouseEnter={(e) => handleMouseEnter(r, c, e)}
        />
      );
    }
  }

  return (
    <div className="lego-grid-container">
      <div className="grid-metrics">
        <span>{algorithm.toUpperCase()}</span>
        <span>Cost: <span className="metric-highlight">{sandbox.pathCost}</span></span>
        <span>Nodes: <span className="metric-highlight">{sandbox.nodesExplored}</span></span>
      </div>
      
      <div 
        className="lego-grid-surface"
        style={{ 
          gridTemplateRows: `repeat(${rows}, var(--node-size))`,
          gridTemplateColumns: `repeat(${cols}, var(--node-size))` 
        }}
      >
        {cells}
      </div>

      <div className="xai-mini-log">
        {xaiLogs.slice(-3).map((log, idx) => (
            <div key={idx} style={{opacity: 0.3 + (idx * 0.35)}}>{log}</div>
        ))}
      </div>
    </div>
  );
}

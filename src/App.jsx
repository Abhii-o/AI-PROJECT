import React, { useState, useCallback } from 'react';
import './App.css';
import LegoGrid from './components/LegoGrid';
import LegoBlock from './components/LegoBlock';

const ROWS = 12;
const COLS = 16;
const DEFAULT_START = { r: 5, c: 2 };
const DEFAULT_GOAL = { r: 5, c: 13 };

const PALETTE_OPTIONS = [
  { id: 'wall', label: 'Wall', type: 'wall' },
  { id: 'empty', label: 'Eraser', type: 'empty' },
  { id: 'start', label: 'Start Pos', type: 'start' },
  { id: 'goal', label: 'Goal Pos', type: 'goal' },
  { id: 'danger', label: 'Danger', type: 'danger' },
  { id: 'reward', label: 'Reward', type: 'reward' },
];

function App() {
  const [gridConfig, setGridConfig] = useState(new Map());
  const [startPos, setStartPos] = useState(DEFAULT_START);
  const [goalPos, setGoalPos] = useState(DEFAULT_GOAL);

  const [mode, setMode] = useState('solve'); // build, solve, compare
  const [algorithm, setAlgorithm] = useState('astar');
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(70);

  const [activeBrush, setActiveBrush] = useState('wall');

  const handleModeChange = (newMode) => {
    setIsPlaying(false);
    setMode(newMode);
  };

  const handlePlayPause = () => {
    if (mode === 'build') setMode('solve');
    setIsPlaying(!isPlaying);
  };

  const handleClearGrid = () => {
    setIsPlaying(false);
    setGridConfig(new Map());
    setStartPos(DEFAULT_START);
    setGoalPos(DEFAULT_GOAL);
  };

  const handleGenerateRandomMaze = () => {
    setIsPlaying(false);
    const newConfig = new Map();
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (Math.random() < 0.25) {
          if ((r !== startPos.r || c !== startPos.c) && (r !== goalPos.r || c !== goalPos.c)) {
            newConfig.set(`${r},${c}`, 'wall');
          }
        }
      }
    }
    setGridConfig(newConfig);
  };

  const handleExport = () => {
    const data = {
      startPos,
      goalPos,
      gridConfig: Array.from(gridConfig.entries())
    };
    const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'lego-level.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target.result);
        if (data.startPos && data.goalPos && data.gridConfig) {
          setStartPos(data.startPos);
          setGoalPos(data.goalPos);
          setGridConfig(new Map(data.gridConfig));
          setIsPlaying(false);
        }
      } catch (err) {
        console.error("Invalid level file", err);
      }
    };
    reader.readAsText(file);
    e.target.value = null; // reset input
  };

  const handleBlockInteract = useCallback((r, c, isDragging) => {
    // Cannot overwrite Start or Goal directly unless using Start/Goal brush
    const isOverStart = r === startPos.r && c === startPos.c;
    const isOverGoal = r === goalPos.r && c === goalPos.c;

    if (activeBrush === 'start') {
      if (!isOverGoal) setStartPos({ r, c });
      return;
    }
    if (activeBrush === 'goal') {
      if (!isOverStart) setGoalPos({ r, c });
      return;
    }

    if (isOverStart || isOverGoal) return;

    setGridConfig(prev => {
      const next = new Map(prev);
      const id = `${r},${c}`;
      if (activeBrush === 'empty') {
        next.delete(id);
      } else {
        next.set(id, activeBrush);
      }
      return next;
    });
  }, [activeBrush, startPos, goalPos]);

  return (
    <div className="app-container">
      {/* Sidebar Controls */}
      <aside className="sidebar">
        <div className="brand">
          <h1>LEGO AI</h1>
          <p>Decision Lab</p>
        </div>

        <div className="control-section">
          <h3>Palette</h3>
          <div className="palette-grid">
            {PALETTE_OPTIONS.map(opt => (
              <div 
                key={opt.id} 
                className={`palette-btn ${activeBrush === opt.id ? 'active' : ''}`}
                onClick={() => setActiveBrush(opt.id)}
              >
                <div style={{ pointerEvents: 'none', transform: 'scale(0.8)' }}>
                  <LegoBlock type={opt.type} />
                </div>
                <span className="palette-label">{opt.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="control-section">
          <h3>Simulation Settings</h3>
          <label style={{fontSize: '0.8rem'}}>Algorithm (Solve Mode)</label>
          <select 
            value={algorithm} 
            onChange={(e) => { setAlgorithm(e.target.value); setIsPlaying(false); }}
            disabled={mode === 'compare'}
          >
            <option value="astar">A* Search</option>
            <option value="dijkstra">Dijkstra's</option>
            <option value="greedy">Greedy Best-First</option>
            <option value="bfs">Breadth-First (BFS)</option>
            <option value="dfs">Depth-First (DFS)</option>
          </select>

          <label style={{fontSize: '0.8rem', marginTop: '8px'}}>Speed: {speed}%</label>
          <input 
            type="range" 
            min="1" max="100" 
            value={speed} 
            onChange={e => setSpeed(Number(e.target.value))} 
          />
        </div>

        <div className="control-section" style={{marginTop: 'auto', gap: '8px'}}>
          <button onClick={handleGenerateRandomMaze}>Random Obstacles</button>
          <div style={{display: 'flex', gap: '8px'}}>
            <button style={{flex: 1}} onClick={handleExport}>Export Level</button>
            <label className="palette-btn" style={{flex: 1, margin: 0, padding: '8px 12px', justifyContent: 'center'}}>
              Import Level
              <input type="file" accept=".json" style={{display: 'none'}} onChange={handleImport} />
            </label>
          </div>
          <button className="danger" onClick={handleClearGrid}>Clear Sandbox</button>
        </div>
      </aside>

      {/* Main Canvas Area */}
      <main className="main-area">
        <div className="top-bar">
          <div className="mode-pills">
            <div className={`mode-pill ${mode === 'build' ? 'active' : ''}`} onClick={() => handleModeChange('build')}>🔨 Build Mode</div>
            <div className={`mode-pill ${mode === 'solve' ? 'active' : ''}`} onClick={() => handleModeChange('solve')}>🤖 Solve Mode</div>
            <div className={`mode-pill ${mode === 'compare' ? 'active' : ''}`} onClick={() => handleModeChange('compare')}>📊 Compare Mode</div>
          </div>
          
          <div style={{ display: 'flex', gap: '12px' }}>
             <button 
                className={`primary ${isPlaying ? 'danger' : ''}`} 
                onClick={handlePlayPause}
                style={{ width: '120px' }}
             >
                {isPlaying ? 'Stop AI' : 'Run AI'}
             </button>
          </div>
        </div>

        <div className={`canvas ${mode === 'compare' ? 'compare-mode' : ''}`}>
          {mode === 'build' || mode === 'solve' ? (
            <LegoGrid 
              rows={ROWS} 
              cols={COLS}
              gridConfig={gridConfig}
              startPos={startPos}
              goalPos={goalPos}
              algorithm={algorithm}
              isPlaying={isPlaying}
              speed={speed}
              mode={mode}
              onBlockInteract={handleBlockInteract}
            />
          ) : null}

          {mode === 'compare' ? (
            <>
              <LegoGrid 
                rows={ROWS} cols={COLS} gridConfig={gridConfig} startPos={startPos} goalPos={goalPos}
                algorithm="bfs" isPlaying={isPlaying} speed={speed} mode="solve"
                onBlockInteract={() => {}}
              />
              <LegoGrid 
                rows={ROWS} cols={COLS} gridConfig={gridConfig} startPos={startPos} goalPos={goalPos}
                algorithm="dijkstra" isPlaying={isPlaying} speed={speed} mode="solve"
                onBlockInteract={() => {}}
              />
              <LegoGrid 
                rows={ROWS} cols={COLS} gridConfig={gridConfig} startPos={startPos} goalPos={goalPos}
                algorithm="astar" isPlaying={isPlaying} speed={speed} mode="solve"
                onBlockInteract={() => {}}
              />
            </>
          ) : null}
        </div>
      </main>
    </div>
  );
}

export default App;

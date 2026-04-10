import { useState, useRef, useEffect, useCallback } from 'react';
import { genericSearch } from '../algorithms/legoSearch';

export function useLegoSandbox({ isGoal, getNeighbors, heuristic, onReset }) {
  const [nodesExplored, setNodesExplored] = useState(0);
  const [pathCost, setPathCost] = useState(0);
  const [frontierSize, setFrontierSize] = useState(0);
  const [status, setStatus] = useState('idle'); // idle, playing, paused, found, not_found
  const [finalPath, setFinalPath] = useState(null);
  
  const [gridOverlay, setGridOverlay] = useState(new Map()); // stateId -> 'frontier' | 'visited' | 'path'
  const [xaiLogs, setXaiLogs] = useState([]); // Array of string messages
  
  const searchGeneratorMap = useRef(null);
  const intervalRef = useRef(null);

  const initSearch = useCallback((startState, strategy) => {
    searchGeneratorMap.current = genericSearch(startState, getNeighbors, isGoal, heuristic, strategy);
    setGridOverlay(new Map());
    setXaiLogs([]);
    setNodesExplored(0);
    setPathCost(0);
    setFrontierSize(0);
    setStatus('idle');
    setFinalPath(null);
    if (onReset) onReset();
  }, [getNeighbors, isGoal, heuristic, onReset]);

  const addLog = (msg) => {
      setXaiLogs(prev => [...prev, `[System]: ${msg}`]);
  };

  const step = useCallback(() => {
    if (!searchGeneratorMap.current || status === 'found' || status === 'not_found') return false;
    
    const { value, done } = searchGeneratorMap.current.next();
    
    if (value) {
      if (value.type === 'xai_log') {
          addLog(value.message);
          return true; // continue stepping to find an actual visual state change
      }

      if (value.nodesExplored !== undefined) setNodesExplored(value.nodesExplored);
      if (value.frontierSize !== undefined) setFrontierSize(value.frontierSize);
      if (value.currentPathCost !== undefined) setPathCost(value.currentPathCost);

      if (value.type === 'found') {
        setStatus('found');
        setFinalPath(value.path);
        setGridOverlay(prev => {
          const nextState = new Map(prev);
          value.path.forEach(node => nextState.set(node, 'path'));
          return nextState;
        });
        return false;
      } else if (value.type === 'not_found') {
        setStatus('not_found');
        return false;
      } else if (value.type === 'visited' || value.type === 'frontier') {
        setGridOverlay(prev => {
          const nextState = new Map(prev);
          if (value.type === 'visited') {
            nextState.set(value.state, 'visited');
          } else if (value.type === 'frontier' && nextState.get(value.state) !== 'visited') {
            nextState.set(value.state, 'frontier');
          }
          return nextState;
        });
      }
    }
    
    if (done) {
       setStatus('not_found');
       return false;
    }
    return true;
  }, [status]);

  const play = useCallback((speed) => {
    if (status === 'found' || status === 'not_found') return;
    setStatus('playing');
    
    // speed is 1 to 100. Let's map it to ms delay:
    // speed 100 = 10ms, speed 1 = 300ms
    const delay = 310 - (speed * 3);

    intervalRef.current = setInterval(() => {
      const hasMore = step();
      if (!hasMore) {
        clearInterval(intervalRef.current);
      }
    }, delay);
  }, [status, step]);

  const pause = useCallback(() => {
    if (status === 'playing') setStatus('paused');
    clearInterval(intervalRef.current);
  }, [status]);

  useEffect(() => {
    return () => clearInterval(intervalRef.current);
  }, []);

  return {
    gridOverlay,
    nodesExplored,
    pathCost,
    frontierSize,
    status,
    finalPath,
    xaiLogs,
    initSearch,
    play,
    pause,
    step
  };
}

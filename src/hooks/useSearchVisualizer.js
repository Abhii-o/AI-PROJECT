import { useState, useRef, useEffect, useCallback } from 'react';
import { genericSearch } from '../algorithms/search';

export function useSearchVisualizer({ isGoal, getNeighbors, heuristic, onReset }) {
  const [nodesExplored, setNodesExplored] = useState(0);
  const [pathCost, setPathCost] = useState(0);
  const [frontierSize, setFrontierSize] = useState(0);
  const [status, setStatus] = useState('idle'); // idle, playing, paused, found, not_found
  const [finalPath, setFinalPath] = useState(null); // stores the path array when found
  const [latestState, setLatestState] = useState(null); // the state string most recently processed
  
  const [gridState, setGridState] = useState(new Map()); // map of stateId -> 'frontier' | 'visited' | 'path'
  const searchGeneratorMap = useRef(null);
  
  const intervalRef = useRef(null);

  const initSearch = useCallback((startState, strategy) => {
    searchGeneratorMap.current = genericSearch(startState, getNeighbors, isGoal, heuristic, strategy);
    setGridState(new Map());
    setNodesExplored(0);
    setPathCost(0);
    setFrontierSize(0);
    setStatus('idle');
    setFinalPath(null);
    setLatestState(startState);
    if (onReset) onReset();
  }, [getNeighbors, isGoal, heuristic, onReset]);

  const step = useCallback(() => {
    if (!searchGeneratorMap.current || status === 'found' || status === 'not_found') return false;
    
    const { value, done } = searchGeneratorMap.current.next();
    
    if (value) {
      setNodesExplored(value.nodesExplored);
      setFrontierSize(value.frontierSize);
      if (value.currentPathCost !== undefined) setPathCost(value.currentPathCost);

      if (value.type === 'found') {
        setStatus('found');
        setFinalPath(value.path);
        setGridState(prev => {
          const nextState = new Map(prev);
          value.path.forEach(node => nextState.set(node, 'path'));
          return nextState;
        });
        return false;
      } else if (value.type === 'not_found') {
        setStatus('not_found');
        return false;
      } else if (value.type === 'visited' || value.type === 'frontier') {
        setLatestState(value.state);
        setGridState(prev => {
          const nextState = new Map(prev);
          // Only upgrade state if from unexplored -> frontier -> visited
          // Or don't downgrade visited -> frontier
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
       // if finished without returning result
       setStatus('not_found');
       return false;
    }
    return true;
  }, [status]);

  const play = useCallback((speed) => {
    if (status === 'found' || status === 'not_found') return;
    setStatus('playing');
    
    // speed is 1 to 100. Let's map it to ms delay:
    // speed 100 = 10ms, speed 1 = 500ms
    const delay = 510 - (speed * 5);

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

  // Cleanup on unmount
  useEffect(() => {
    return () => clearInterval(intervalRef.current);
  }, []);

  return {
    gridState,
    nodesExplored,
    pathCost,
    frontierSize,
    status,
    finalPath,
    latestState,
    initSearch,
    play,
    pause,
    step
  };
}

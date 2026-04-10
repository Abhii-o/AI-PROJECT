// Priority Queue for A*, Dijkstra, Greedy
class PriorityQueue {
  constructor(comparator = (a, b) => a.cost - b.cost) {
    this.items = [];
    this.comparator = comparator;
  }
  enqueue(item) {
    let added = false;
    for (let i = 0; i < this.items.length; i++) {
      if (this.comparator(item, this.items[i]) < 0) {
        this.items.splice(i, 0, item);
        added = true;
        break;
      }
    }
    if (!added) this.items.push(item);
  }
  dequeue() { return this.items.shift(); }
  isEmpty() { return this.items.length === 0; }
  size() { return this.items.length; }
}

export class SearchNode {
  constructor(state, parent = null, g = 0, h = 0) {
    this.state = state; // The identifier for the state
    this.parent = parent;
    this.g = g; // Path cost from start
    this.h = h; // Heuristic
    this.f = g + h; // Total cost
  }
}

// Helper to trace back the path
const reconstructPath = (node) => {
  const path = [];
  let curr = node;
  while (curr) {
    path.push(curr.state);
    curr = curr.parent;
  }
  return path.reverse();
};

/**
 * Generic Graph Search Generator
 * Yields state updates for visualization.
 * 
 * @param {any} startState 
 * @param {function} getNeighbors - (state) => [{state, cost}]
 * @param {function} isGoal - (state) => boolean
 * @param {function} heuristic - (state) => number
 * @param {string} strategy - bfs | dfs | dijkstra | astar | greedy
 */
export function* genericSearch(startState, getNeighbors, isGoal, heuristic = () => 0, strategy = 'bfs') {
  let frontier;
  let usePQ = ['dijkstra', 'astar', 'greedy'].includes(strategy);
  
  if (usePQ) {
    frontier = new PriorityQueue();
  } else {
    frontier = []; // We will use Array for Stack (DFS) and Queue (BFS)
  }

  const startNode = new SearchNode(startState, null, 0, heuristic(startState));
  
  if (usePQ) frontier.enqueue(startNode);
  else frontier.push(startNode);

  const explored = new Set();
  const frontierMap = new Map(); // Keep track of best g-values in frontier
  frontierMap.set(startState, 0);

  let nodesExploredCount = 0;

  while ( (usePQ && !frontier.isEmpty()) || (!usePQ && frontier.length > 0) ) {
    let currentNode;
    if (usePQ) {
      currentNode = frontier.dequeue();
    } else if (strategy === 'bfs') {
      currentNode = frontier.shift(); // Queue
    } else if (strategy === 'dfs') {
      currentNode = frontier.pop(); // Stack
    }

    const { state, g } = currentNode;

    if (isGoal(state)) {
      yield {
        type: 'found',
        path: reconstructPath(currentNode),
        nodesExplored: nodesExploredCount,
        frontierSize: usePQ ? frontier.size() : frontier.length,
        currentPathCost: g
      };
      return;
    }

    explored.add(state);
    nodesExploredCount++;

    // Yield "visited" state
    yield {
      type: 'visited',
      state: state,
      nodesExplored: nodesExploredCount,
      frontierSize: usePQ ? frontier.size() : frontier.length,
      currentPathCost: g
    };

    const neighbors = getNeighbors(state);
    for (const neighbor of neighbors) {
      const neighborState = neighbor.state;
      const stepCost = neighbor.cost || 1;
      const newG = g + stepCost;

      if (!explored.has(neighborState)) {
        let addToFrontier = false;
        
        if (!frontierMap.has(neighborState)) {
          addToFrontier = true;
        } else if (usePQ && newG < frontierMap.get(neighborState)) {
          // Found a better path to node in frontier
          addToFrontier = true;
        }

        if (addToFrontier) {
          const hVal = heuristic(neighborState);
          let neighborNode;

          if (strategy === 'astar') {
            neighborNode = new SearchNode(neighborState, currentNode, newG, hVal);
          } else if (strategy === 'greedy') {
            // Greedy ignores g, only f = h
            neighborNode = new SearchNode(neighborState, currentNode, newG, hVal);
            neighborNode.f = hVal; 
          } else if (strategy === 'dijkstra') {
            neighborNode = new SearchNode(neighborState, currentNode, newG, 0);
          } else {
            neighborNode = new SearchNode(neighborState, currentNode, newG, 0);
          }

          if (usePQ) {
            frontier.enqueue(neighborNode);
          } else {
            frontier.push(neighborNode);
          }
           
          frontierMap.set(neighborState, newG);

          // Yield "frontier" state
          yield {
            type: 'frontier',
            state: neighborState,
            nodesExplored: nodesExploredCount,
            frontierSize: usePQ ? frontier.size() : frontier.length,
            currentPathCost: g
          };
        }
      }
    }
  }

  // Not found
  yield {
    type: 'not_found',
    nodesExplored: nodesExploredCount,
    frontierSize: 0,
    currentPathCost: 0
  };
}

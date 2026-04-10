// Priority Queue for A*, Dijkstra, Greedy
class PriorityQueue {
  constructor(comparator = (a, b) => a.f - b.f) {
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
    this.state = state; // e.g. "r,c"
    this.parent = parent;
    this.g = g;
    this.h = h;
    this.f = g + h;
  }
}

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
 * Valid block types and their base movement costs
 */
export const BLOCK_COSTS = {
  empty: 5,
  wall: Infinity,
  start: 5,
  goal: 5,
  danger: 50,  // High penalty
  reward: 1,   // Low cost
  trigger: 5
};

export const getCost = (blockType) => BLOCK_COSTS[blockType] || 5;

/**
 * Generic Graph Search Generator for LEGO AI Decision Lab
 */
export function* genericSearch(startState, getNeighbors, isGoal, heuristic = () => 0, strategy = 'astar') {
  let frontier;
  let usePQ = ['dijkstra', 'astar', 'greedy'].includes(strategy);
  
  if (usePQ) {
      // For PQ, sort by f(n)
      frontier = new PriorityQueue();
  } else {
      frontier = []; 
  }

  const startNode = new SearchNode(startState, null, 0, heuristic(startState));
  
  if (usePQ) frontier.enqueue(startNode);
  else frontier.push(startNode);

  const explored = new Set();
  const frontierMap = new Map();
  frontierMap.set(startState, 0);

  let nodesExploredCount = 0;

  yield {
      type: 'xai_log',
      message: `Initialized ${strategy.toUpperCase()} search algorithm.`
  };

  while ((usePQ && !frontier.isEmpty()) || (!usePQ && frontier.length > 0)) {
      let currentNode;
      if (usePQ) currentNode = frontier.dequeue();
      else if (strategy === 'bfs') currentNode = frontier.shift(); 
      else if (strategy === 'dfs') currentNode = frontier.pop(); 

      const { state, g } = currentNode;

      if (isGoal(state)) {
          yield {
              type: 'xai_log',
              message: `Goal reached at ${state}! Total cost: ${g}. Returning optimal path.`
          };
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
          const stepCost = neighbor.cost;
          const blockType = neighbor.type;
          
          if (stepCost === Infinity) continue;

          const newG = g + stepCost;

          if (!explored.has(neighborState)) {
              let addToFrontier = false;
              
              if (!frontierMap.has(neighborState)) {
                  addToFrontier = true;
              } else if (usePQ && newG < frontierMap.get(neighborState)) {
                  addToFrontier = true;
                  yield {
                      type: 'xai_log',
                      message: `Found a cheaper path to ${neighborState} (Cost: ${newG})`
                  };
              }

              if (addToFrontier) {
                  const hVal = heuristic(neighborState);
                  let neighborNode;

                  if (strategy === 'astar') neighborNode = new SearchNode(neighborState, currentNode, newG, hVal);
                  else if (strategy === 'greedy') {
                      neighborNode = new SearchNode(neighborState, currentNode, newG, hVal);
                      neighborNode.f = hVal; 
                  } else if (strategy === 'dijkstra') neighborNode = new SearchNode(neighborState, currentNode, newG, 0);
                  else neighborNode = new SearchNode(neighborState, currentNode, newG, 0);

                  if (usePQ) frontier.enqueue(neighborNode);
                  else frontier.push(neighborNode);
                   
                  frontierMap.set(neighborState, newG);

                  yield {
                      type: 'frontier',
                      state: neighborState,
                      nodesExplored: nodesExploredCount,
                      frontierSize: usePQ ? frontier.size() : frontier.length,
                      currentPathCost: g
                  };

                  // Yield reasoning based on block type occasionally
                  if (blockType === 'danger') {
                      yield { type: 'xai_log', message: `Evaluating DANGER block at ${neighborState}. Heavy penalty applied (+50).` };
                  } else if (blockType === 'reward') {
                      yield { type: 'xai_log', message: `Evaluating REWARD block at ${neighborState}. Low cost preference.` };
                  }
              }
          }
      }
  }

  yield { type: 'xai_log', message: 'Frontier exhausted. No path to goal found.' };
  yield {
      type: 'not_found',
      nodesExplored: nodesExploredCount,
      frontierSize: 0,
      currentPathCost: 0
  };
}

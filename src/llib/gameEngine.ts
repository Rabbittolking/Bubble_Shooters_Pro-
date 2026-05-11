export const BUBBLE_RADIUS = 16;
export const DIAMETER = BUBBLE_RADIUS * 2;
export const COLS = 8;
export const ROW_HEIGHT = BUBBLE_RADIUS * 1.732; // sqrt(3)
export const MAX_ROWS = 14;

export const COLORS = [
  '#ef4444', // Red
  '#3b82f6', // Blue
  '#22c55e', // Green
  '#eab308', // Yellow
  '#a855f7', // Purple
  '#06b6d4', // Cyan
];

export type BubbleType = 'normal' | 'bomb' | 'rainbow' | 'laser';

export interface Bubble { // Represents a cell in the grid
  r: number;
  c: number;
  color: string;
  type?: BubbleType;
}

export interface FlyingBubble {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  type?: BubbleType;
}

// Pixel coords representing the center of grid slot (r, c)
export function getGridPixelCoords(r: number, c: number) {
  const isOdd = r % 2 === 1;
  const x = isOdd ? (c * DIAMETER + DIAMETER) : (c * DIAMETER + BUBBLE_RADIUS);
  const y = r * ROW_HEIGHT + BUBBLE_RADIUS;
  return { x, y };
}

// Find closest valid grid slot for an arbitrary pixel position
export function findClosestGridSlot(x: number, y: number): { r: number, c: number } {
  let bestDist = Infinity;
  let bestR = 0, bestC = 0;

  for (let r = 0; r < MAX_ROWS; r++) {
    const isOdd = r % 2 === 1;
    const maxCols = isOdd ? COLS - 1 : COLS;
    for (let c = 0; c < maxCols; c++) {
      const p = getGridPixelCoords(r, c);
      const dist = Math.hypot(p.x - x, p.y - y);
      if (dist < bestDist) {
        bestDist = dist;
        bestR = r;
        bestC = c;
      }
    }
  }
  return { r: bestR, c: bestC };
}

// Get neighboring slots for a given hex grid cell
export function getNeighbors(r: number, c: number) {
  const isOdd = r % 2 === 1;
  const neighbors = [];
  
  if (isOdd) {
    neighbors.push({ r: r, c: c - 1 });
    neighbors.push({ r: r, c: c + 1 });
    neighbors.push({ r: r - 1, c: c });
    neighbors.push({ r: r - 1, c: c + 1 });
    neighbors.push({ r: r + 1, c: c });
    neighbors.push({ r: r + 1, c: c + 1 });
  } else {
    neighbors.push({ r: r, c: c - 1 });
    neighbors.push({ r: r, c: c + 1 });
    neighbors.push({ r: r - 1, c: c - 1 });
    neighbors.push({ r: r - 1, c: c });
    neighbors.push({ r: r + 1, c: c - 1 });
    neighbors.push({ r: r + 1, c: c });
  }

  // Filter out bounds
  return neighbors.filter(n => {
    if (n.r < 0 || n.r >= MAX_ROWS) return false;
    const maxCols = (n.r % 2 === 1) ? COLS - 1 : COLS;
    if (n.c < 0 || n.c >= maxCols) return false;
    return true;
  });
}

// DFS to find color matches
export function findMatches(board: Bubble[], startR: number, startC: number, targetColor: string, isRainbowStart: boolean = false): Bubble[] {
  const visited = new Set<string>();
  const matches: Bubble[] = [];
  const stack = [{ r: startR, c: startC }];

  while (stack.length > 0) {
    const { r, c } = stack.pop()!;
    const key = `${r},${c}`;
    if (visited.has(key)) continue;
    visited.add(key);

    const b = board.find(bx => bx.r === r && bx.c === c);
    if (!b) continue;
    
    const isStart = (r === startR && c === startC);
    if (b.color === targetColor || b.type === 'rainbow' || (isStart && isRainbowStart)) {
      matches.push(b);
      const neighbors = getNeighbors(r, c);
      for (const n of neighbors) {
        stack.push(n);
      }
    }
  }

  return matches;
}

// Find unattached bubbles (not connected to top row)
export function findFloating(board: Bubble[]): Bubble[] {
  const visited = new Set<string>();
  const stack: {r: number, c: number}[] = [];

  // Start with all bubbles in the top row
  for (const b of board) {
    if (b.r === 0) {
      stack.push({ r: b.r, c: b.c });
    }
  }

  // BFS/DFS to find all firmly attached bubbles
  while (stack.length > 0) {
    const { r, c } = stack.pop()!;
    const key = `${r},${c}`;
    if (visited.has(key)) continue;
    
    // Only process if it exists in board
    const b = board.find(bx => bx.r === r && bx.c === c);
    if (!b) continue;

    visited.add(key);
    const neighbors = getNeighbors(r, c);
    for (const n of neighbors) {
      stack.push(n);
    }
  }

  // Any bubble not in visited set is floating
  return board.filter(b => !visited.has(`${b.r},${b.c}`));
}

export function generateLevel(level: number): Bubble[] {
  // 5000 levels scaling
  // Rows: 5 to 12
  const maxAllowedRows = Math.min(5 + Math.floor(level / 30), MAX_ROWS - 2); 
  const numRows = maxAllowedRows;

  // Colors: 3 to 6
  const numColors = Math.min(3 + Math.floor(level / 20), COLORS.length);
  const levelColors = COLORS.slice(0, numColors);
  
  const board: Bubble[] = [];
  for (let r = 0; r < numRows; r++) {
    const maxCols = (r % 2 === 1) ? COLS - 1 : COLS;
    for (let c = 0; c < maxCols; c++) {
      // Chance of gaps increases in higher levels (max 15%)
      const emptyChance = level > 10 ? Math.min((level - 10) * 0.005, 0.15) : 0;
      
      if (Math.random() > emptyChance) {
        board.push({
          r, c,
          color: levelColors[Math.floor(Math.random() * levelColors.length)]
        });
      }
    }
  }

  // Place 1-2 bombs
  const numBombs = Math.random() > 0.5 ? 2 : 1;
  const boardSize = board.length;
  for (let i = 0; i < numBombs; i++) {
     if (boardSize > 10) {
        // avoid absolute top row
        const idx = Math.floor(Math.random() * (boardSize - 5)) + 5;
        if (board[idx]) {
          board[idx].type = 'bomb';
        }
     }
  }

  return board;
}

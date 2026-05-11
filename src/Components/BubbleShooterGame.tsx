import React, { useEffect, useRef, useState } from 'react';
import { 
  BUBBLE_RADIUS, DIAMETER, COLS, ROW_HEIGHT, MAX_ROWS, COLORS,
  Bubble, FlyingBubble, getGridPixelCoords, findClosestGridSlot, 
  findMatches, findFloating, generateLevel, getNeighbors
} from '../lib/gameEngine';
import { sounds } from '../lib/sounds';

export interface GameProps {
  key?: string | number;
  level: number;
  isPaused: boolean;
  onGameOver: () => void;
  onWin: () => void;
}

export const BubbleShooterGame = ({ level, onGameOver, onWin, isPaused }: GameProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const isPausedRef = useRef(isPaused);
  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);

  // Use ref for game state to avoid react re-renders in the tight animation loop
  const gameState = useRef({
    board: [] as Bubble[],
    nextBubble: { color: COLORS[0], type: 'normal' } as { color: string, type: 'normal' | 'bomb' | 'rainbow' | 'laser' },
    currentBubble: { color: COLORS[1], type: 'normal' } as { color: string, type: 'normal' | 'bomb' | 'rainbow' | 'laser' },
    flying: null as FlyingBubble | null,
    angle: -Math.PI / 2, // Start aiming straight up
    state: 'playing' as 'playing' | 'animating' | 'won' | 'lost',
    shotsTaken: 0,
    width: COLS * DIAMETER,
    height: 600, // Reasonable fixed height
  });

  const generateRandomBubble = (board: Bubble[]) => {
    // 5% chance of powerup
    if (Math.random() < 0.05) {
      const types = ['bomb', 'rainbow', 'laser'] as const;
      return {
        color: '#000',
        type: types[Math.floor(Math.random() * types.length)]
      };
    }
    
    // Only generate colors that still exist on the board
    const availableColors = Array.from(new Set(board.filter(b => !b.type || b.type === 'normal').map(b => b.color)));
    if (availableColors.length === 0) return { color: COLORS[0], type: 'normal' as const };
    return { 
      color: availableColors[Math.floor(Math.random() * availableColors.length)], 
      type: 'normal' as const 
    };
  };

  useEffect(() => {
    // Initialize board
    gameState.current.board = generateLevel(level);
    gameState.current.currentBubble = generateRandomBubble(gameState.current.board);
    gameState.current.nextBubble = generateRandomBubble(gameState.current.board);
    gameState.current.state = 'playing';
    gameState.current.shotsTaken = 0;
  }, [level]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const render = () => {
      const state = gameState.current;
      
      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Draw background
      if (state.state === 'lost') {
        ctx.fillStyle = 'rgba(255, 0, 0, 0.1)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      } else {
        // Dark grid background
        ctx.fillStyle = '#0f172a'; // slate-900
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.strokeStyle = 'rgba(255,255,255,0.02)';
        ctx.lineWidth = 1;
        for(let i=0; i<canvas.width; i+=DIAMETER) {
           ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, canvas.height); ctx.stroke();
        }
        for(let j=0; j<canvas.height; j+=ROW_HEIGHT) {
           ctx.beginPath(); ctx.moveTo(0, j); ctx.lineTo(canvas.width, j); ctx.stroke();
        }
      }

      // Draw bottom limit line
      const limitY = MAX_ROWS * ROW_HEIGHT + BUBBLE_RADIUS;
      ctx.beginPath();
      ctx.moveTo(0, limitY);
      ctx.lineTo(canvas.width, limitY);
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 8]);
      ctx.stroke();
      ctx.setLineDash([]);

      // Draw boarded bubbles
      for (const b of state.board) {
        const { x, y } = getGridPixelCoords(b.r, b.c);
        drawBubble(ctx, x, y, b.color, b.type);
      }

      // Physics cannon origin
      const cannonX = canvas.width / 2;
      const cannonY = canvas.height - BUBBLE_RADIUS;

      // Draw aiming line
      if (state.state === 'playing') {
        ctx.beginPath();
        ctx.moveTo(cannonX, cannonY);
        ctx.lineTo( cannonX + Math.cos(state.angle) * 150, cannonY + Math.sin(state.angle) * 150);
        ctx.strokeStyle = 'rgba(255,255,255,0.15)';
        ctx.lineWidth = 3;
        ctx.setLineDash([6, 6]);
        ctx.stroke();
        ctx.setLineDash([]);
        
        // Draw current bubble loaded
        drawBubble(ctx, cannonX, cannonY, state.currentBubble.color, state.currentBubble.type);
      }

      // Draw flying bubble
      if (state.flying) {
        drawBubble(ctx, state.flying.x, state.flying.y, state.flying.color, state.flying.type);
      }

      // Draw next bubble hint with swap icon
      if (state.state === 'playing' || state.state === 'flying') {
        const nextX = cannonX + 60;
        const nextY = cannonY + 5;
        drawBubble(ctx, nextX, nextY, state.nextBubble.color, state.nextBubble.type, BUBBLE_RADIUS * 0.7);
        
        ctx.beginPath();
        ctx.arc(nextX - 22, nextY, 7, Math.PI * 0.5, Math.PI * 1.5);
        ctx.arc(nextX - 22, nextY + 4, 7, -Math.PI * 0.5, Math.PI * 0.5);
        ctx.strokeStyle = '#6366f1';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    };

    const drawBubble = (ctx: CanvasRenderingContext2D, x: number, y: number, color: string, type: string = 'normal', r: number = BUBBLE_RADIUS) => {
      if (type === 'normal') {
        ctx.beginPath();
        ctx.arc(x, y, r - 1, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
        
        // highlight
        ctx.beginPath();
        ctx.arc(x - r * 0.3, y - r * 0.3, r * 0.3, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,255,255,0.4)';
        ctx.fill();

      } else if (type === 'bomb') {
         ctx.beginPath();
         ctx.arc(x, y, r - 1, 0, Math.PI * 2);
         ctx.fillStyle = '#1f2937'; // dark gray
         ctx.fill();
         // draw fuse
         ctx.beginPath();
         ctx.moveTo(x, y - r * 0.5);
         ctx.quadraticCurveTo(x + r*0.5, y - r, x + r*0.8, y - r*0.8);
         ctx.strokeStyle = '#f59e0b';
         ctx.lineWidth = 2;
         ctx.stroke();
         // red center
         ctx.beginPath();
         ctx.arc(x, y, r * 0.4, 0, Math.PI * 2);
         ctx.fillStyle = '#ef4444';
         ctx.fill();
      } else if (type === 'rainbow') {
         const gradient = ctx.createLinearGradient(x - r, y - r, x + r, y + r);
         gradient.addColorStop(0, '#ef4444');
         gradient.addColorStop(0.2, '#eab308');
         gradient.addColorStop(0.4, '#22c55e');
         gradient.addColorStop(0.6, '#06b6d4');
         gradient.addColorStop(0.8, '#3b82f6');
         gradient.addColorStop(1, '#a855f7');
         ctx.beginPath();
         ctx.arc(x, y, r - 1, 0, Math.PI * 2);
         ctx.fillStyle = gradient;
         ctx.fill();
         // white star center
         ctx.beginPath();
         ctx.arc(x, y, r * 0.4, 0, Math.PI * 2);
         ctx.fillStyle = 'rgba(255,255,255,0.8)';
         ctx.fill();
      } else if (type === 'laser') {
         ctx.beginPath();
         ctx.arc(x, y, r - 1, 0, Math.PI * 2);
         ctx.fillStyle = '#0f172a'; // dark slate
         ctx.fill();
         // laser beam across
         ctx.beginPath();
         ctx.moveTo(x - r + 3, y);
         ctx.lineTo(x + r - 3, y);
         ctx.strokeStyle = '#06b6d4';
         ctx.lineWidth = 4;
         ctx.shadowBlur = 5;
         ctx.shadowColor = '#06b6d4';
         ctx.stroke();
         ctx.shadowBlur = 0; // reset
      }
    };

    const updatePlayLogic = () => {
      const state = gameState.current;
      if (!state.flying) return;

      // Move
      state.flying.x += state.flying.vx;
      state.flying.y += state.flying.vy;

      // Bounce sides
      if (state.flying.x <= BUBBLE_RADIUS) {
        state.flying.x = BUBBLE_RADIUS;
        state.flying.vx *= -1;
      } else if (state.flying.x >= canvas.width - BUBBLE_RADIUS) {
        state.flying.x = canvas.width - BUBBLE_RADIUS;
        state.flying.vx *= -1;
      }

      let collided = false;

      // Hit top limit
      if (state.flying.y <= BUBBLE_RADIUS) {
        collided = true;
      } else {
        // Check collision against board bubbles
        for (const b of state.board) {
          const { x, y } = getGridPixelCoords(b.r, b.c);
          const dist = Math.hypot(x - state.flying.x, y - state.flying.y);
          if (dist <= DIAMETER - 2) {
            collided = true;
            break;
          }
        }
      }

      if (collided) {
        // Snap to grid
        const { r, c } = findClosestGridSlot(state.flying.x, state.flying.y);
        
        // Prevent stacking exactly on top if slot is full (rare but possible jitter)
        const isOccupied = state.board.some(b => b.r === r && b.c === c);
        
        if (!isOccupied) {
            state.board.push({ r, c, color: state.flying.color, type: state.flying.type });
            const justLanded = state.board[state.board.length - 1];
            state.flying = null;

            let matches: Bubble[] = [];

            // Check if we hit any existing bombs
            const landingNeighbors = getNeighbors(r, c);
            const triggeredBombs = landingNeighbors
               .map(nCoords => state.board.find(b => b.r === nCoords.r && b.c === nCoords.c))
               .filter(b => b?.type === 'bomb') as Bubble[];
               
            if (justLanded.type === 'bomb') {
               triggeredBombs.push(justLanded);
            }

            if (triggeredBombs.length > 0) {
              sounds.bomb();
              matches = [];
              for (const tb of triggeredBombs) {
                if (!matches.includes(tb)) matches.push(tb);
              }
              let currentDist = [...matches];
              for (let step = 0; step < 2; step++) {
                let nextDist: Bubble[] = [];
                for (const b of currentDist) {
                   const n = getNeighbors(b.r, b.c);
                   for (const neigh of n) {
                      const nb = state.board.find(x => x.r === neigh.r && x.c === neigh.c);
                      if (nb && !matches.includes(nb)) {
                         matches.push(nb);
                         nextDist.push(nb);
                      }
                   }
                }
                currentDist = nextDist;
              }
            } else if (justLanded.type === 'laser') {
               matches = state.board.filter(b => b.r === r);
            } else if (justLanded.type === 'rainbow') {
               matches = [justLanded];
               const neighborCoords = getNeighbors(r, c);
               const neighColors = new Set<string>();
               for (const nc of neighborCoords) {
                  const nb = state.board.find(x => x.r === nc.r && x.c === nc.c && x.type !== 'rainbow');
                  if (nb) neighColors.add(nb.color);
               }
               for (const color of neighColors) {
                  const subMatches = findMatches(state.board, r, c, color, true);
                  if (subMatches.length >= 3) {
                     for (const sm of subMatches) {
                       if (!matches.includes(sm)) matches.push(sm);
                     }
                  }
               }
            } else {
              matches = findMatches(state.board, r, c, justLanded.color);
            }

            if (matches.length >= 3 || justLanded.type === 'bomb' || justLanded.type === 'laser') {
              if (justLanded.type !== 'bomb' && justLanded.type !== 'laser') {
                sounds.match(Math.min(5, Math.floor(matches.length / 3)));
              }
              // Remove matches
              state.board = state.board.filter(b => !matches.includes(b));
              // Check orphans
              const floating = findFloating(state.board);
              if (floating.length > 0 && justLanded.type !== 'bomb') {
                setTimeout(() => sounds.match(2), 100);
              }
              state.board = state.board.filter(b => !floating.includes(b));
            }

            // Game over logic
            const currentMaxR = Math.max(...state.board.map(b => b.r), 0);
            if (currentMaxR >= MAX_ROWS - 1) {
              sounds.lose();
              state.state = 'lost';
              onGameOver();
            } else if (state.board.length === 0) {
              sounds.win();
              state.state = 'won';
              onWin();
            } else {
              // progressive difficulty: fewer shots before dropping
              const shotsBeforeDrop = Math.max(3, 7 - Math.floor(level / 10));
              
              if (matches.length < 3 && justLanded.type !== 'bomb' && justLanded.type !== 'laser' && justLanded.type !== 'rainbow') {
                 state.shotsTaken += 1;
                 if (state.shotsTaken >= shotsBeforeDrop) {
                    state.shotsTaken = 0;
                    // Shift board down
                    state.board.forEach(b => {
                       b.r += 1;
                       // adjust c if rows alternate in shifting.
                       // Every even row has 1 offset, odd has another.
                       // Just shifting r + 1 will automatically handle the offset via getGridPixelCoords because it depends on r % 2. However, the visual structure might wobble. To be perfect, we should add a new row at top and shift everything.
                    });
                    
                    // Generate new top row
                    for (let c = 0; c < COLS; c++) {
                       if (Math.random() < 0.8) { // 80% fill rate for new row
                          state.board.push(generateRandomBubble(state.board));
                          state.board[state.board.length - 1].r = 0;
                          state.board[state.board.length - 1].c = c;
                       }
                    }
                 }
              }
              
              const newMaxR = Math.max(...state.board.map(b => b.r), 0);
              if (newMaxR >= MAX_ROWS - 1) {
                  sounds.lose();
                  state.state = 'lost';
                  onGameOver();
              } else {
                  state.state = 'playing';
                  state.currentBubble = state.nextBubble;
                  state.nextBubble = generateRandomBubble(state.board);
              }
            }
        } else {
            // Failsafe, just consume it to avoid infinite bounce bug
             state.flying = null;
             state.state = 'playing';
             state.currentBubble = state.nextBubble;
             state.nextBubble = generateRandomBubble(state.board);
        }
      }
    };

    const loop = () => {
      if (!isPausedRef.current) {
        updatePlayLogic();
      }
      // Always render so the visuals don't freeze un-refreshed
      render();
      animId = requestAnimationFrame(loop);
    };
    
    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [onGameOver, onWin]);

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || gameState.current.state !== 'playing' || isPausedRef.current) return;
    
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    const mouseX = (e.clientX - rect.left) * scaleX;
    const mouseY = (e.clientY - rect.top) * scaleY;
    
    const cannonX = canvas.width / 2;
    const cannonY = canvas.height - BUBBLE_RADIUS;

    // Angle constrained to top half arc
    let angle = Math.atan2(mouseY - cannonY, mouseX - cannonX);
    if (angle > -0.1) angle = -0.1; // Don't shoot below horizontal right
    if (angle < -Math.PI + 0.1) angle = -Math.PI + 0.1; // Don't shoot below horizontal left

    gameState.current.angle = angle;
  };

  const fire = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (gameState.current.state !== 'playing' || isPausedRef.current) return;
    
    // Check if clicked exactly on the "Next Bubble" or cannon to swap
    const canvas = canvasRef.current;
    if (canvas) {
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const mouseX = (e.clientX - rect.left) * scaleX;
      const mouseY = (e.clientY - rect.top) * scaleY;

      const cannonX = canvas.width / 2;
      const cannonY = canvas.height - BUBBLE_RADIUS;
      const nextX = cannonX + 60;
      const nextY = cannonY + 5;
      
      if (Math.hypot(mouseX - nextX, mouseY - nextY) < BUBBLE_RADIUS * 2 ||
          Math.hypot(mouseX - cannonX, mouseY - cannonY) < BUBBLE_RADIUS * 2) {
         // Swap bubbles!
         const temp = gameState.current.currentBubble;
         gameState.current.currentBubble = gameState.current.nextBubble;
         gameState.current.nextBubble = temp;
         return; 
      }
      
      // Update angle on click/touch before firing (fixes mobile touch direction)
      let angle = Math.atan2(mouseY - cannonY, mouseX - cannonX);
      if (angle > -0.1) angle = -0.1;
      if (angle < -Math.PI + 0.1) angle = -Math.PI + 0.1;
      gameState.current.angle = angle;
    }

    sounds.shoot();

    const speed = Math.min(25, 12 + (level - 1) * 0.2); // pixels per frame
    const vX = Math.cos(gameState.current.angle) * speed;
    const vY = Math.sin(gameState.current.angle) * speed;

    gameState.current.flying = {
      x: gameState.current.width / 2,
      y: gameState.current.height - BUBBLE_RADIUS,
      vx: vX,
      vy: vY,
      color: gameState.current.currentBubble.color,
      type: gameState.current.currentBubble.type
    };
    gameState.current.state = 'animating';
    gameState.current.shotsTaken += 1;
  };

  // If component receives an "continue" signal (we just expose a handler via ref if needed, 
  // but better to just let App re-mount with lower row count)
  // Wait, if player watches an ad to continue, we can just remove the bottom 4 rows on the board!

  // Allow parent to imperatively call continueGame
  useEffect(() => {
    const handleContinueEvent = () => {
      if (gameState.current.state === 'lost') {
        const board = gameState.current.board;
        // Find bottom-most row
        const maxR = Math.max(...board.map(b => b.r), 0);
        // Remove bubbles in the bottom 4 rows
        const threshold = maxR - 4;
        gameState.current.board = board.filter(b => b.r <= threshold);
        
        gameState.current.state = 'playing';
      }
    };
    window.addEventListener('bubble-continue', handleContinueEvent);
    return () => window.removeEventListener('bubble-continue', handleContinueEvent);
  }, []);

  return (
    <div className="absolute inset-0 flex flex-col items-center z-10 bg-slate-950">
      <div className="w-full h-full relative flex items-center justify-center overflow-hidden flex-1">
        <canvas
          ref={canvasRef}
          width={COLS * DIAMETER}
          height={650}
          onPointerMove={handlePointerMove}
          onPointerDown={handlePointerMove}
          onPointerUp={fire}
          className="w-full h-full object-contain touch-none bg-slate-950"
        />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-500/10 via-transparent to-transparent pointer-events-none"></div>
      </div>
    </div>
  );
};

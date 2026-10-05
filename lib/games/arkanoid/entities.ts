import {
  BALL_SIZE,
  BASE_BALL_VX,
  BASE_BALL_VY,
  BLOCK_H,
  BLOCK_W,
  BLOCKS_ORIGIN_X,
  BLOCKS_ORIGIN_Y,
  H,
  LIFE_BALL_MARGIN,
  LIFE_BALL_SIZE,
  LIFE_BALL_SPACING,
  LIFE_BALL_Y,
  PADDLE_H,
  PADDLE_W,
  PADDLE_Y,
  W,
} from "./constants";
import { LEVELS } from "./levels";
import {
  EXPLOSION_DURATION,
  EXPLOSION_FRAMES,
  EXPLOSION_FRAME_COUNT,
  drawBallSprite,
  drawBlockSprite,
  drawFrame,
  drawPaddleSprite,
  type BlockColor,
  type Spritesheet,
} from "./sprites";

export type Rect = { x: number; y: number; w: number; h: number };
export type Paddle = Rect;
export type Ball = Rect & { vx: number; vy: number };
export type Block = Rect & { color: BlockColor; alive: boolean };
export type Explosion = Rect & { color: BlockColor; elapsed: number }; // elapsed en ms

export function createPaddle(): Paddle {
  return { x: (W - PADDLE_W) / 2, y: PADDLE_Y, w: PADDLE_W, h: PADDLE_H };
}

export function createBall(): Ball {
  return { x: 0, y: 0, w: BALL_SIZE, h: BALL_SIZE, vx: BASE_BALL_VX, vy: BASE_BALL_VY };
}

/** Coloca la pelota sobre la paleta con la velocidad del nivel (1–5). */
export function placeBall(ball: Ball, paddle: Paddle, level: number) {
  const speed = LEVELS[level - 1].speed;
  ball.x = paddle.x + (paddle.w - ball.w) / 2;
  ball.y = paddle.y - ball.h;
  ball.vx = BASE_BALL_VX * speed;
  ball.vy = BASE_BALL_VY * speed;
}

export function createBlocks(level: number): Block[] {
  return LEVELS[level - 1].blocks.map((b) => ({
    x: BLOCKS_ORIGIN_X + b.col * BLOCK_W,
    y: BLOCKS_ORIGIN_Y + b.row * BLOCK_H,
    w: BLOCK_W,
    h: BLOCK_H,
    color: b.color,
    alive: true,
  }));
}

export function createExplosion(block: Block): Explosion {
  return { x: block.x, y: block.y, w: block.w, h: block.h, color: block.color, elapsed: 0 };
}

export function collideAABB(ball: Rect, block: Rect): boolean {
  return (
    ball.x < block.x + block.w &&
    ball.x + ball.w > block.x &&
    ball.y < block.y + block.h &&
    ball.y + ball.h > block.y
  );
}

export function clampPaddleX(x: number): number {
  return Math.max(0, Math.min(W - PADDLE_W, x));
}

export function drawBackground(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, W, H);
}

export function drawBlocks(ctx: CanvasRenderingContext2D, sheet: Spritesheet, blocks: Block[]) {
  for (const b of blocks) {
    if (b.alive) drawBlockSprite(ctx, sheet, b.color, b.x, b.y, b.w, b.h);
  }
}

export function drawExplosions(
  ctx: CanvasRenderingContext2D,
  sheet: Spritesheet,
  explosions: Explosion[],
) {
  for (const e of explosions) {
    const i = Math.min(
      Math.floor((e.elapsed / EXPLOSION_DURATION) * EXPLOSION_FRAME_COUNT),
      EXPLOSION_FRAME_COUNT - 1,
    );
    drawFrame(ctx, sheet, EXPLOSION_FRAMES[e.color][i], e.x, e.y, e.w, e.h);
  }
}

export function drawPaddle(ctx: CanvasRenderingContext2D, sheet: Spritesheet, p: Paddle) {
  drawPaddleSprite(ctx, sheet, p.x, p.y, p.w, p.h);
}

export function drawBall(ctx: CanvasRenderingContext2D, sheet: Spritesheet, b: Ball) {
  drawBallSprite(ctx, sheet, b.x, b.y, b.w, b.h);
}

/** Pelotas de vida alineadas a la derecha. */
export function drawLives(ctx: CanvasRenderingContext2D, sheet: Spritesheet, lives: number) {
  for (let i = 0; i < lives; i++) {
    const x = W - LIFE_BALL_MARGIN - (lives - i) * (LIFE_BALL_SIZE + LIFE_BALL_SPACING);
    drawBallSprite(ctx, sheet, x, LIFE_BALL_Y, LIFE_BALL_SIZE, LIFE_BALL_SIZE);
  }
}

export const VIEW_WIDTH = 900;
export const VIEW_HEIGHT = 760;
export const BOARD_X = 82;
export const BOARD_Y = 124;
export const CELL_SIZE = 96;
export const CELL_GAP = 8;
export const BOARD_WIDTH = 7 * CELL_SIZE;
export const BOARD_HEIGHT = 6 * CELL_SIZE;

export function cellPosition(c: number, r: number): { x: number; y: number } {
  return {
    x: BOARD_X + c * CELL_SIZE,
    y: BOARD_Y + (5 - r) * CELL_SIZE,
  };
}

export function columnFromCanvasPoint(x: number, y: number): number | null {
  if (x < BOARD_X || x >= BOARD_X + BOARD_WIDTH || y < BOARD_Y - 54 || y >= BOARD_Y + BOARD_HEIGHT) {
    return null;
  }
  const col = Math.floor((x - BOARD_X) / CELL_SIZE);
  return col >= 0 && col < 7 ? col : null;
}

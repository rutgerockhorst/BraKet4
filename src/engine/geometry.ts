import type { Coord, GameState, SlotRole } from "./types";

export function landingCoord(state: GameState, col: number): Coord | null {
  if (!Number.isInteger(col) || col < 0 || col >= state.rules.cols) return null;
  const column = state.cols[col];
  if (!column) return null;
  for (let r = 0; r < state.rules.rows; r += 1) {
    if (column[r]?.value === null) return { c: col, r };
  }
  return null;
}

export function roleAt(state: GameState, col: number): SlotRole | null {
  const coord = landingCoord(state, col);
  if (!coord) return null;
  const slot = state.cols[coord.c]?.[coord.r];
  if (!slot) return null;
  if (!slot.ket) return "ket";
  if (!slot.op) return "operator";
  return "bra";
}

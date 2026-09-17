import type { CellValue, Coord, GameState, PlayerId } from "./types";

const DIRECTIONS = [
  [1, 0],
  [0, 1],
  [1, 1],
  [1, -1],
] as const;

export interface Settlement {
  winner: PlayerId | "draw" | null;
  winCells: Coord[];
}

export function playerForValue(value: CellValue): PlayerId {
  return value === 1 ? 0 : 1;
}

export function findSettlement(state: GameState): Settlement {
  for (let c = 0; c < state.rules.cols; c += 1) {
    for (let r = 0; r < state.rules.rows; r += 1) {
      const value = state.cols[c]?.[r]?.value;
      if (value === null || value === undefined) continue;
      for (const [dc, dr] of DIRECTIONS) {
        const cells: Coord[] = [];
        let matches = true;
        for (let i = 0; i < 4; i += 1) {
          const cc = c + dc * i;
          const rr = r + dr * i;
          if (
            cc < 0 ||
            cc >= state.rules.cols ||
            rr < 0 ||
            rr >= state.rules.rows ||
            state.cols[cc]?.[rr]?.value !== value
          ) {
            matches = false;
            break;
          }
          cells.push({ c: cc, r: rr });
        }
        if (matches) return { winner: playerForValue(value), winCells: cells };
      }
    }
  }

  const full = state.cols.every((col) => col.every((slot) => slot.value !== null));
  return full ? { winner: "draw", winCells: [] } : { winner: null, winCells: [] };
}

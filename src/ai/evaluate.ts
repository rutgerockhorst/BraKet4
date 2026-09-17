import { outcomeProbabilities } from "../engine/operators";
import type { GameState } from "../engine/types";

const DIRECTIONS = [
  [1, 0],
  [0, 1],
  [1, 1],
  [1, -1],
] as const;
const WEIGHTS = [0, 1, 12, 180, 100_000] as const;

export function evaluate(state: GameState): number {
  if (state.winner === 0) return 1_000_000 - state.moveNo;
  if (state.winner === 1) return -1_000_000 + state.moveNo;
  if (state.winner === "draw") return 0;

  let score = 0;
  for (let c = 0; c < state.rules.cols; c += 1) {
    for (let r = 0; r < state.rules.rows; r += 1) {
      for (const [dc, dr] of DIRECTIONS) {
        const values: (0 | 1)[] = [];
        let inBounds = true;
        for (let i = 0; i < 4; i += 1) {
          const cc = c + dc * i;
          const rr = r + dr * i;
          if (cc < 0 || cc >= state.rules.cols || rr < 0 || rr >= state.rules.rows) {
            inBounds = false;
            break;
          }
          const value = state.cols[cc]?.[rr]?.value;
          if (value !== null && value !== undefined) values.push(value);
        }
        if (!inBounds) continue;
        const blue = values.filter((value) => value === 1).length;
        const red = values.filter((value) => value === 0).length;
        if (blue > 0 && red === 0) score += WEIGHTS[blue] ?? 0;
        if (red > 0 && blue === 0) score -= WEIGHTS[red] ?? 0;
      }

      const slot = state.cols[c]?.[r];
      if (!slot) continue;
      const center = Math.max(0, 3 - Math.abs((state.rules.cols - 1) / 2 - c));
      if (slot.value === 1) score += center * 0.2;
      if (slot.value === 0) score -= center * 0.2;
      if (slot.ket && slot.op && !slot.bra) {
        const bra = state.turn;
        const expectedBlue = outcomeProbabilities(slot.ket.state, bra, slot.op.key).reduce(
          (sum, branch) => sum + branch.probability * branch.value,
          0,
        );
        score += (expectedBlue * 2 - 1) * 0.8;
      }
    }
  }
  return score;
}

import { commitMove, legalMoves, planMove } from "../engine/moves";
import { resolutionBranches } from "../engine/resolution";
import type { GameState, Move } from "../engine/types";
import { evaluate } from "./evaluate";

export interface SearchOptions {
  depth: number;
  quiescence: number;
  random: () => number;
  exploration?: number;
}

interface Branch {
  probability: number;
  state: GameState;
}

function branches(state: GameState, move: Move): Branch[] {
  const planned = planMove(state, move);
  if (!planned.ok) throw new Error(planned.error);
  return resolutionBranches(planned.value).map((branch) => {
    const committed = commitMove(state, planned.value, branch.measurements);
    if (!committed.ok) throw new Error(committed.error);
    return { probability: branch.probability, state: committed.value.state };
  });
}

function stateKey(state: GameState, depth: number, quiescence: number): string {
  const board = state.cols
    .flatMap((column) =>
      column.map((slot) => {
        if (slot.value !== null) return slot.value === 1 ? "B" : "R";
        if (!slot.ket) return ".";
        if (!slot.op) return slot.ket.state === 0 ? "a" : "b";
        return `${slot.ket.state}${slot.op.key}`;
      }),
    )
    .join("");
  return `${state.turn}|${depth}|${quiescence}|${board}`;
}

function resolvingMoves(state: GameState): Move[] {
  return legalMoves(state).filter((move) => {
    const plan = planMove(state, move);
    return plan.ok && plan.value.stage === "bra";
  });
}

function expectedMoveValue(
  state: GameState,
  move: Move,
  depth: number,
  quiescence: number,
  cache: Map<string, number>,
): number {
  return branches(state, move).reduce(
    (sum, branch) => sum + branch.probability * searchValue(branch.state, depth - 1, quiescence, cache),
    0,
  );
}

function searchValue(
  state: GameState,
  depth: number,
  quiescence: number,
  cache: Map<string, number>,
): number {
  if (state.winner !== null) return evaluate(state);
  const key = stateKey(state, depth, quiescence);
  const cached = cache.get(key);
  if (cached !== undefined) return cached;

  let moves: Move[];
  let nextQuiescence = quiescence;
  if (depth <= 0) {
    if (quiescence <= 0) return evaluate(state);
    moves = resolvingMoves(state);
    if (moves.length === 0) return evaluate(state);
    nextQuiescence -= 1;
  } else {
    moves = legalMoves(state);
  }

  const values = moves.map((move) =>
    expectedMoveValue(state, move, Math.max(0, depth), nextQuiescence, cache),
  );
  const result = state.turn === 0 ? Math.max(...values) : Math.min(...values);
  cache.set(key, result);
  return result;
}

export function chooseMove(state: GameState, options: SearchOptions): Move {
  const moves = legalMoves(state);
  if (moves.length === 0) throw new Error("No legal moves");
  if (options.random() < (options.exploration ?? 0)) {
    return moves[Math.floor(options.random() * moves.length)] ?? moves[0]!;
  }

  const cache = new Map<string, number>();
  const values = moves.map((move) =>
    expectedMoveValue(state, move, options.depth, options.quiescence, cache),
  );
  const target = state.turn === 0 ? Math.max(...values) : Math.min(...values);
  const best = moves.filter((_, index) => Math.abs((values[index] ?? 0) - target) < 1e-9);
  return best[Math.floor(options.random() * best.length)] ?? best[0] ?? moves[0]!;
}

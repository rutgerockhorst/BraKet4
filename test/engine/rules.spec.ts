import { describe, expect, it } from "vitest";
import { commitMove, legalMoves, planMove } from "../../src/engine/moves";
import { replayTurns } from "../../src/engine/replay";
import { newGameState } from "../../src/engine/state";
import type { BasisState, GameState, Move, TurnRecord } from "../../src/engine/types";

function execute(state: GameState, move: Move, measurements: BasisState[] = []) {
  const plan = planMove(state, move);
  expect(plan.ok).toBe(true);
  if (!plan.ok) throw new Error(plan.error);
  const committed = commitMove(state, plan.value, measurements);
  expect(committed.ok).toBe(true);
  if (!committed.ok) throw new Error(committed.error);
  return committed.value;
}

function freezeDeep<T>(value: T): T {
  if (value && typeof value === "object") {
    Object.freeze(value);
    for (const nested of Object.values(value as Record<string, unknown>)) freezeDeep(nested);
  }
  return value;
}

describe("three-stage sandwich rules", () => {
  it("requires ket, operator, then bra", () => {
    const initial = newGameState(0);
    const ket = execute(initial, { kind: "drop", col: 0 });
    expect(ket.state.cols[0]?.[0]?.ket?.state).toBe(0);
    expect(ket.state.turn).toBe(1);
    expect(legalMoves(ket.state).filter((move) => move.col === 0)).toEqual([
      { kind: "operator", col: 0, key: "I" },
      { kind: "operator", col: 0, key: "X" },
      { kind: "operator", col: 0, key: "H" },
    ]);

    const illegal = planMove(ket.state, { kind: "drop", col: 0 });
    expect(illegal.ok).toBe(false);

    const op = execute(ket.state, { kind: "operator", col: 0, key: "I" });
    expect(op.state.cols[0]?.[0]?.op?.key).toBe("I");
    expect(legalMoves(op.state).filter((move) => move.col === 0)).toEqual([
      { kind: "drop", col: 0 },
    ]);
  });

  it("resolves I to one for equal halves", () => {
    let state = newGameState(0);
    state = execute(state, { kind: "drop", col: 0 }).state;
    state = execute(state, { kind: "operator", col: 0, key: "I" }).state;
    state = execute(state, { kind: "drop", col: 0 }).state;
    expect(state.cols[0]?.[0]?.value).toBe(1);
  });

  it("resolves I to zero for different halves", () => {
    let state = newGameState(0);
    state = execute(state, { kind: "drop", col: 0 }).state;
    state = execute(state, { kind: "operator", col: 0, key: "I" }).state;
    state = execute(state, { kind: "drop", col: 1 }).state;
    state = execute(state, { kind: "drop", col: 0 }).state;
    expect(state.cols[0]?.[0]?.value).toBe(0);
  });

  it("reverses deterministic payoff with X", () => {
    let equal = newGameState(0);
    equal = execute(equal, { kind: "drop", col: 0 }).state;
    equal = execute(equal, { kind: "operator", col: 0, key: "X" }).state;
    equal = execute(equal, { kind: "drop", col: 0 }).state;
    expect(equal.cols[0]?.[0]?.value).toBe(0);

    let different = newGameState(0);
    different = execute(different, { kind: "drop", col: 0 }).state;
    different = execute(different, { kind: "operator", col: 0, key: "X" }).state;
    different = execute(different, { kind: "drop", col: 1 }).state;
    different = execute(different, { kind: "drop", col: 0 }).state;
    expect(different.cols[0]?.[0]?.value).toBe(1);
  });

  it("requires and records exactly one H measurement", () => {
    let state = newGameState(0);
    state = execute(state, { kind: "drop", col: 0 }).state;
    state = execute(state, { kind: "operator", col: 0, key: "H" }).state;
    const planned = planMove(state, { kind: "drop", col: 0 });
    if (!planned.ok) throw new Error(planned.error);
    expect(commitMove(state, planned.value).ok).toBe(false);
    const result = commitMove(state, planned.value, [1]);
    if (!result.ok) throw new Error(result.error);
    expect(result.value.record.measurements).toEqual([1]);
    expect(result.value.state.cols[0]?.[0]?.value).toBe(0);
  });

  it("does not mutate a frozen input state", () => {
    const state = freezeDeep(newGameState(0));
    const plan = planMove(state, { kind: "drop", col: 0 });
    if (!plan.ok) throw new Error(plan.error);
    expect(() => commitMove(state, plan.value)).not.toThrow();
    expect(state.cols[0]?.[0]?.ket).toBeNull();
  });

  it("replays every recorded outcome", () => {
    const turns: TurnRecord[] = [
      { move: { kind: "drop", col: 0 }, measurements: [] },
      { move: { kind: "operator", col: 0, key: "H" }, measurements: [] },
      { move: { kind: "drop", col: 0 }, measurements: [0] },
    ];
    const replayed = replayTurns(0, turns);
    if (!replayed.ok) throw new Error(replayed.error);
    expect(replayed.value.cols[0]?.[0]?.value).toBe(1);
    expect(replayed.value.moveNo).toBe(3);
  });
});

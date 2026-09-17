import { describe, expect, it } from "vitest";
import { newGameState } from "../../src/engine/state";
import type { BasisState } from "../../src/engine/types";
import { findSettlement } from "../../src/engine/win";

function resolved(value: BasisState, id: number) {
  return {
    ket: { id, state: 0 as const, owner: 0 as const },
    op: { key: "I" as const, owner: 0 as const },
    bra: { id: id + 100, state: 0 as const, owner: 0 as const },
    value,
  };
}

describe("settlement", () => {
  it("awards four ones to Blue", () => {
    const state = newGameState();
    for (let c = 0; c < 4; c += 1) state.cols[c]![0] = resolved(1, c + 1);
    expect(findSettlement(state)).toEqual({
      winner: 0,
      winCells: [
        { c: 0, r: 0 },
        { c: 1, r: 0 },
        { c: 2, r: 0 },
        { c: 3, r: 0 },
      ],
    });
  });

  it("awards four zeroes to Red", () => {
    const state = newGameState();
    for (let r = 0; r < 4; r += 1) state.cols[0]![r] = resolved(0, r + 1);
    expect(findSettlement(state).winner).toBe(1);
  });
});

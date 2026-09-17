import { describe, expect, it } from "vitest";
import { planMove } from "../../src/engine/moves";
import { newGameState } from "../../src/engine/state";
import type { MovePlan, OperatorKey } from "../../src/engine/types";
import { ForgeQuantumRuntime } from "../../src/quantum/ForgeQuantumRuntime";

function braPlan(ket: 0 | 1, bra: 0 | 1, operator: OperatorKey, id = 1): Extract<MovePlan, { stage: "bra" }> {
  return {
    stage: "bra",
    move: { kind: "drop", col: 0 },
    coord: { c: 0, r: 0 },
    player: bra,
    half: { id: id + 1, state: bra, owner: bra },
    ket: { id, state: ket, owner: ket },
    operator: { key: operator, owner: 0 },
  };
}

describe("ForgeQuantumRuntime", () => {
  it("prepares both basis states", () => {
    const runtime = new ForgeQuantumRuntime();
    runtime.prepareKet({ id: 1, state: 0, owner: 0 });
    runtime.prepareKet({ id: 2, state: 1, owner: 1 });
    expect(runtime.probabilityOfOne(1)).toBeCloseTo(0, 8);
    expect(runtime.probabilityOfOne(2)).toBeCloseTo(1, 8);
    runtime.resetRegistry();
    expect(runtime.activeCount).toBe(0);
  });

  it("implements deterministic I and X sandwiches", () => {
    const runtime = new ForgeQuantumRuntime();
    runtime.prepareKet({ id: 10, state: 0, owner: 0 });
    expect(runtime.resolveSandwich(braPlan(0, 0, "I", 10)).measured).toBe(0);
    runtime.prepareKet({ id: 20, state: 0, owner: 0 });
    expect(runtime.resolveSandwich(braPlan(0, 0, "X", 20)).measured).toBe(1);
    expect(runtime.activeCount).toBe(0);
  });

  it("makes H reach both basis outcomes", () => {
    const runtime = new ForgeQuantumRuntime();
    const seen = new Set<number>();
    for (let id = 100; id < 164; id += 1) {
      runtime.prepareKet({ id, state: 0, owner: 0 });
      seen.add(runtime.resolveSandwich(braPlan(0, 0, "H", id)).measured);
    }
    expect(seen).toEqual(new Set([0, 1]));
  });

  it("can force a recorded H outcome during replay", () => {
    const runtime = new ForgeQuantumRuntime();
    const state = newGameState();
    const ketPlan = planMove(state, { kind: "drop", col: 0 });
    if (!ketPlan.ok || ketPlan.value.stage !== "ket") throw new Error("expected ket");
    runtime.prepareKet(ketPlan.value.half);
    const plan = braPlan(0, 0, "H", ketPlan.value.half.id);
    expect(runtime.resolveSandwich(plan, 1).measured).toBe(1);
  });
});

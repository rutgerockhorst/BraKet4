import { describe, expect, it } from "vitest";
import { chooseMove } from "../../src/ai/search";
import { runBalance, seededRandom } from "../../src/ai/selfPlay";
import { commitMove, legalMoves, planMove } from "../../src/engine/moves";
import { newGameState } from "../../src/engine/state";

function advanceToOperator() {
  const state = newGameState(0);
  const plan = planMove(state, { kind: "drop", col: 0 });
  if (!plan.ok) throw new Error(plan.error);
  const committed = commitMove(state, plan.value);
  if (!committed.ok) throw new Error(committed.error);
  return committed.value.state;
}

describe("operator-aware search", () => {
  it("returns a legal operator move", () => {
    const state = advanceToOperator();
    const move = chooseMove(state, {
      depth: 2,
      quiescence: 1,
      random: seededRandom(42),
    });
    expect(legalMoves(state)).toContainEqual(move);
  });

  it("runs both starter assignments reproducibly", () => {
    const config = {
      gamesPerStarter: 2,
      depth: 1,
      quiescence: 1,
      seed: 17,
      exploration: 0.05,
    };
    expect(runBalance(config)).toEqual(runBalance(config));
    const report = runBalance(config);
    expect(report.starters.map((result) => result.starter)).toEqual([0, 1]);
    expect(report.blueRate + report.redRate + report.drawRate).toBeCloseTo(1, 10);
  }, 30_000);
});

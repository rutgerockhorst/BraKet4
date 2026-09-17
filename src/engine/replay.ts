import { commitMove, planMove } from "./moves";
import { newGameState } from "./state";
import type { GameRecord, GameState, Result, RuleSet, TurnRecord } from "./types";

export function replayTurns(
  starter: 0 | 1,
  turns: readonly TurnRecord[],
  rules?: RuleSet,
): Result<GameState> {
  let state = newGameState(starter, rules);
  for (let index = 0; index < turns.length; index += 1) {
    const turn = turns[index];
    if (!turn) return { ok: false, error: `Missing turn ${index + 1}` };
    const planned = planMove(state, turn.move);
    if (!planned.ok) return { ok: false, error: `Turn ${index + 1}: ${planned.error}` };
    const committed = commitMove(state, planned.value, turn.measurements);
    if (!committed.ok) return { ok: false, error: `Turn ${index + 1}: ${committed.error}` };
    state = committed.value.state;
  }
  return { ok: true, value: state };
}

export function replayGame(record: GameRecord): Result<GameState> {
  if (record.version !== 1) return { ok: false, error: "Unsupported game version" };
  return replayTurns(record.starter, record.turns, record.rules);
}

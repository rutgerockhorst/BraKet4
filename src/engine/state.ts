import { DEFAULT_RULES } from "./ruleset";
import type { GameState, PlayerId, RuleSet, Slot } from "./types";

export function emptySlot(): Slot {
  return { ket: null, op: null, bra: null, value: null };
}

export function newGameState(
  starter: PlayerId = 0,
  rules: RuleSet = DEFAULT_RULES,
): GameState {
  return {
    cols: Array.from({ length: rules.cols }, () =>
      Array.from({ length: rules.rows }, emptySlot),
    ),
    turn: starter,
    starter,
    nextId: 1,
    winner: null,
    winCells: [],
    fresh: null,
    log: [],
    moveNo: 0,
    rules,
  };
}

export function playerName(player: PlayerId): "Blue" | "Red" {
  return player === 0 ? "Blue" : "Red";
}

export function stateForPlayer(player: PlayerId): 0 | 1 {
  return player;
}

export function otherPlayer(player: PlayerId): PlayerId {
  return player === 0 ? 1 : 0;
}

export function assertStateInvariants(state: GameState): void {
  if (state.cols.length !== state.rules.cols) {
    throw new Error("Column count does not match the rule set");
  }
  const ids = new Set<number>();
  for (const col of state.cols) {
    if (col.length !== state.rules.rows) {
      throw new Error("Row count does not match the rule set");
    }
    let foundUnresolved = false;
    for (const slot of col) {
      const complete = slot.value !== null;
      if (complete) {
        if (foundUnresolved || !slot.ket || !slot.op || !slot.bra) {
          throw new Error("Resolved slots must be contiguous and complete");
        }
      } else {
        foundUnresolved = true;
        if (slot.bra || (slot.op && !slot.ket)) {
          throw new Error("Slot stages are out of order");
        }
      }
      for (const half of [slot.ket, slot.bra]) {
        if (!half) continue;
        if (ids.has(half.id)) throw new Error(`Duplicate half id ${half.id}`);
        ids.add(half.id);
      }
    }
  }
}

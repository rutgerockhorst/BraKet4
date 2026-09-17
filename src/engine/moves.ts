import { landingCoord, roleAt } from "./geometry";
import { applyDeterministicOperator } from "./operators";
import { otherPlayer, playerName, stateForPlayer } from "./state";
import type {
  BasisState,
  CommitResult,
  GameEvent,
  GameState,
  Move,
  MovePlan,
  Result,
  Slot,
  TurnRecord,
} from "./types";
import { findSettlement } from "./win";

export function legalMoves(state: GameState): Move[] {
  if (state.winner !== null) return [];
  const moves: Move[] = [];
  for (let col = 0; col < state.rules.cols; col += 1) {
    const role = roleAt(state, col);
    if (role === "ket" || role === "bra") moves.push({ kind: "drop", col });
    if (role === "operator") {
      for (const key of state.rules.operators) moves.push({ kind: "operator", col, key });
    }
  }
  return moves;
}

export function planMove(state: GameState, move: Move): Result<MovePlan> {
  if (state.winner !== null) return { ok: false, error: "The game is already over" };
  const coord = landingCoord(state, move.col);
  if (!coord) return { ok: false, error: "That column is full or invalid" };
  const role = roleAt(state, move.col);
  const slot = state.cols[coord.c]?.[coord.r];
  if (!slot || !role) return { ok: false, error: "The landing slot is invalid" };

  if (role === "operator") {
    if (move.kind !== "operator") {
      return { ok: false, error: "This sandwich needs an operator before its bra" };
    }
    if (!state.rules.operators.includes(move.key)) {
      return { ok: false, error: `Operator ${move.key} is not enabled` };
    }
    return {
      ok: true,
      value: {
        stage: "operator",
        move,
        coord,
        player: state.turn,
        operator: { key: move.key, owner: state.turn },
      },
    };
  }

  if (move.kind !== "drop") {
    return {
      ok: false,
      error: role === "ket" ? "Start this cell with a ket" : "Close this sandwich with a bra",
    };
  }

  const half = {
    id: state.nextId,
    state: stateForPlayer(state.turn),
    owner: state.turn,
  } as const;

  if (role === "ket") {
    return { ok: true, value: { stage: "ket", move, coord, player: state.turn, half } };
  }
  if (!slot.ket || !slot.op) return { ok: false, error: "Incomplete sandwich" };
  return {
    ok: true,
    value: {
      stage: "bra",
      move,
      coord,
      player: state.turn,
      half,
      ket: slot.ket,
      operator: slot.op,
    },
  };
}

function replaceSlot(state: GameState, c: number, r: number, slot: Slot): Slot[][] {
  const sourceColumn = state.cols[c];
  if (!sourceColumn) throw new Error("Column does not exist");
  const cols = state.cols.slice();
  const column = sourceColumn.slice();
  column[r] = slot;
  cols[c] = column;
  return cols;
}

function success(
  state: GameState,
  plan: MovePlan,
  slot: Slot,
  logEntry: string,
  events: GameEvent[],
  measurements: BasisState[],
  settle: boolean,
): Result<CommitResult> {
  let next: GameState = {
    ...state,
    cols: replaceSlot(state, plan.coord.c, plan.coord.r, slot),
    nextId: plan.stage === "operator" ? state.nextId : state.nextId + 1,
    fresh: plan.coord,
    log: [...state.log, logEntry],
    moveNo: state.moveNo + 1,
  };

  if (settle) {
    const result = findSettlement(next);
    next = { ...next, winner: result.winner, winCells: result.winCells };
    if (result.winner !== null) {
      events.push({ type: "game-ended", winner: result.winner, cells: result.winCells });
    } else {
      next = { ...next, turn: otherPlayer(state.turn) };
    }
  } else {
    next = { ...next, turn: otherPlayer(state.turn) };
  }

  const record: TurnRecord = { move: plan.move, measurements };
  return { ok: true, value: { state: next, events, record } };
}

export function commitMove(
  state: GameState,
  plan: MovePlan,
  measurements: readonly BasisState[] = [],
): Result<CommitResult> {
  if (state.turn !== plan.player || state.winner !== null) {
    return { ok: false, error: "The move plan is stale" };
  }
  const slot = state.cols[plan.coord.c]?.[plan.coord.r];
  if (!slot) return { ok: false, error: "The planned slot no longer exists" };

  if (plan.stage === "ket") {
    if (measurements.length !== 0 || slot.ket || slot.op || slot.bra || slot.value !== null) {
      return { ok: false, error: "Invalid ket commit" };
    }
    return success(
      state,
      plan,
      { ...slot, ket: plan.half },
      `${playerName(plan.player)} dropped |${plan.half.state}⟩ in column ${plan.coord.c + 1}.`,
      [{ type: "ket-dropped", coord: plan.coord, half: plan.half }],
      [],
      false,
    );
  }

  if (plan.stage === "operator") {
    if (measurements.length !== 0 || !slot.ket || slot.op || slot.bra || slot.value !== null) {
      return { ok: false, error: "Invalid operator commit" };
    }
    return success(
      state,
      plan,
      { ...slot, op: plan.operator },
      `${playerName(plan.player)} forged ${plan.operator.key} in column ${plan.coord.c + 1}.`,
      [{ type: "operator-dropped", coord: plan.coord, operator: plan.operator }],
      [],
      false,
    );
  }

  if (!slot.ket || !slot.op || slot.bra || slot.value !== null) {
    return { ok: false, error: "Invalid bra commit" };
  }

  let measured: BasisState;
  if (plan.operator.key === "H") {
    if (measurements.length !== 1 || measurements[0] === undefined) {
      return { ok: false, error: "Hadamard resolution requires one measurement" };
    }
    measured = measurements[0];
  } else {
    if (measurements.length !== 0) {
      return { ok: false, error: "Deterministic resolution cannot consume a recorded measurement" };
    }
    measured = applyDeterministicOperator(plan.ket.state, plan.operator.key);
  }

  const value: BasisState = measured === plan.half.state ? 1 : 0;
  return success(
    state,
    plan,
    { ...slot, bra: plan.half, value },
    `${playerName(plan.player)} closed ⟨${plan.half.state}|${plan.operator.key}|${plan.ket.state}⟩ → ${value}.`,
    [
      {
        type: "sandwich-resolved",
        coord: plan.coord,
        operator: plan.operator.key,
        measured,
        value,
        stochastic: plan.operator.key === "H",
      },
    ],
    plan.operator.key === "H" ? [measured] : [],
    true,
  );
}

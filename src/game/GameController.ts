import { InputManager } from "quantum-forge-engine/input";
import { commitMove, legalMoves, planMove } from "../engine/moves";
import { newGameState } from "../engine/state";
import type { BasisState, GameRecord, Move, OperatorKey, PlayerId, TurnRecord } from "../engine/types";
import type { QuantumRuntime } from "../quantum/QuantumRuntime";
import type { GameRenderer } from "../rendering/GameRenderer";
import { VIEW_WIDTH, columnFromCanvasPoint } from "../rendering/layout";
import type { HudView } from "../ui/HudView";
import type { BracketGameEngine } from "./BracketGameEngine";

function randomStarter(): PlayerId {
  const bytes = new Uint8Array(1);
  crypto.getRandomValues(bytes);
  return ((bytes[0] ?? 0) & 1) as PlayerId;
}

export class GameController {
  private readonly input = new InputManager({ preventDefaults: true });
  private records: TurnRecord[] = [];
  private cursor = 0;
  private selectedColumn: number | null = null;
  private busyUntil = 0;
  private lastBusy = false;
  private hud: HudView | null = null;

  constructor(
    private readonly engine: BracketGameEngine,
    private readonly quantum: QuantumRuntime,
    private readonly renderer: GameRenderer,
  ) {
    for (let col = 0; col < 7; col += 1) {
      this.input.bind(`column-${col}`, { type: "key", code: `Digit${col + 1}` });
    }
    this.input.bind("operator-I", { type: "key", code: "KeyI" });
    this.input.bind("operator-X", { type: "key", code: "KeyX" });
    this.input.bind("operator-H", { type: "key", code: "KeyH" });
    this.input.bind("undo", { type: "key", code: "KeyZ" });
    this.input.bind("redo", { type: "key", code: "KeyY" });

    this.renderer.getCanvas().addEventListener("pointerdown", (event) => {
      const rect = this.renderer.getCanvas().getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width) * VIEW_WIDTH;
      const col = columnFromCanvasPoint(x, ((event.clientY - rect.top) / rect.height) * 760);
      if (col !== null) this.selectColumn(col);
    });
  }

  attachHud(hud: HudView): void {
    this.hud = hud;
    this.refreshHud();
  }

  update(): void {
    this.input.poll();
    for (let col = 0; col < 7; col += 1) {
      if (this.input.isActionJustPressed(`column-${col}`)) this.selectColumn(col);
    }
    for (const key of ["I", "X", "H"] as const) {
      if (this.input.isActionJustPressed(`operator-${key}`)) this.chooseOperator(key);
    }
    if (this.input.isActionJustPressed("undo")) this.undo();
    if (this.input.isActionJustPressed("redo")) this.redo();
    const busy = this.isBusy();
    if (busy !== this.lastBusy) {
      this.lastBusy = busy;
      this.refreshHud();
    }
  }

  selectColumn(col: number): void {
    if (this.isBusy()) return;
    const moves = legalMoves(this.engine.getState()).filter((move) => move.col === col);
    if (moves.length === 0) return;
    const drop = moves.find((move) => move.kind === "drop");
    if (drop) {
      this.selectedColumn = null;
      this.renderer.setSelectedColumn(null);
      this.submit(drop);
      return;
    }
    this.selectedColumn = col;
    this.renderer.setSelectedColumn(col);
    this.refreshHud();
  }

  chooseOperator(key: OperatorKey): void {
    if (this.selectedColumn === null || this.isBusy()) return;
    this.submit({ kind: "operator", col: this.selectedColumn, key });
    this.selectedColumn = null;
    this.renderer.setSelectedColumn(null);
  }

  undo(): void {
    if (this.isBusy() || this.cursor === 0) return;
    this.rebuild(this.cursor - 1);
  }

  redo(): void {
    if (this.isBusy() || this.cursor >= this.records.length) return;
    this.rebuild(this.cursor + 1);
  }

  restart(): void {
    if (this.isBusy()) return;
    this.quantum.resetRegistry();
    this.records = [];
    this.cursor = 0;
    this.selectedColumn = null;
    this.renderer.setSelectedColumn(null);
    this.engine.getHelpers().resetWithStarter(randomStarter());
    this.refreshHud();
  }

  getRecord(): GameRecord {
    const state = this.engine.getState();
    return { version: 1, starter: state.starter, rules: state.rules, turns: this.records.slice(0, this.cursor) };
  }

  destroy(): void {
    this.input.destroy();
    this.quantum.resetRegistry();
  }

  private submit(move: Move): void {
    const state = this.engine.getState();
    const planned = planMove(state as import("../engine/types").GameState, move);
    if (!planned.ok) {
      this.flashError(planned.error);
      return;
    }

    let measurements: BasisState[] = [];
    try {
      if (planned.value.stage === "ket") {
        this.quantum.prepareKet(planned.value.half);
      } else if (planned.value.stage === "bra") {
        const result = this.quantum.resolveSandwich(planned.value);
        measurements = result.stochastic ? [result.measured] : [];
      }
    } catch (error) {
      this.flashError(error instanceof Error ? error.message : String(error));
      return;
    }

    const committed = commitMove(state as import("../engine/types").GameState, planned.value, measurements);
    if (!committed.ok) {
      this.flashError(committed.error);
      return;
    }

    if (this.cursor < this.records.length) this.records = this.records.slice(0, this.cursor);
    this.records.push(committed.value.record);
    this.cursor += 1;
    this.engine.getHelpers().replaceState(committed.value.state);
    this.renderer.notify(committed.value.events);
    this.hud?.announce(committed.value.events);
    this.busyUntil = performance.now() + (measurements.length > 0 ? 700 : 260);
    this.lastBusy = true;
    this.refreshHud();
  }

  private rebuild(nextCursor: number): void {
    const current = this.engine.getState();
    this.quantum.resetRegistry();
    let state = newGameState(current.starter, current.rules);

    for (let index = 0; index < nextCursor; index += 1) {
      const record = this.records[index];
      if (!record) throw new Error(`Missing replay turn ${index + 1}`);
      const planned = planMove(state, record.move);
      if (!planned.ok) throw new Error(planned.error);
      if (planned.value.stage === "ket") this.quantum.prepareKet(planned.value.half);
      if (planned.value.stage === "bra") {
        const forced = planned.value.operator.key === "H" ? record.measurements[0] : undefined;
        if (planned.value.operator.key === "H" && forced === undefined) {
          throw new Error(`Missing replay measurement at turn ${index + 1}`);
        }
        this.quantum.resolveSandwich(planned.value, forced);
      }
      const committed = commitMove(state, planned.value, record.measurements);
      if (!committed.ok) throw new Error(committed.error);
      state = committed.value.state;
    }

    this.cursor = nextCursor;
    this.selectedColumn = null;
    this.renderer.setSelectedColumn(null);
    this.engine.getHelpers().replaceState(state);
    this.busyUntil = performance.now() + 160;
    this.lastBusy = true;
    this.refreshHud();
  }

  private isBusy(): boolean {
    return performance.now() < this.busyUntil;
  }

  private refreshHud(): void {
    this.hud?.setSelectedColumn(this.selectedColumn);
    this.hud?.render(this.engine.getState() as import("../engine/types").GameState, this.cursor, this.records.length, this.isBusy());
  }

  private flashError(message: string): void {
    const announcement = document.getElementById("game-announcement");
    if (announcement) announcement.textContent = message;
    console.warn(message);
  }
}

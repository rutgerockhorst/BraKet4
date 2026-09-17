import { eventAnnouncement } from "../engine/events";
import { roleAt } from "../engine/geometry";
import { operatorSummary } from "../engine/operators";
import { playerName } from "../engine/state";
import type { GameEvent, GameState, OperatorKey } from "../engine/types";
import { AccessibleBoard } from "./AccessibleBoard";

function required<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Missing #${id}`);
  return element as T;
}

export interface HudHandlers {
  column: (col: number) => void;
  operator: (key: OperatorKey) => void;
  undo: () => void;
  redo: () => void;
  restart: () => void;
}

export class HudView {
  private readonly turn = required<HTMLDivElement>("turn-indicator");
  private readonly columns = required<HTMLDivElement>("column-controls");
  private readonly requiredAction = required<HTMLHeadingElement>("required-action");
  private readonly operatorHelp = required<HTMLParagraphElement>("operator-help");
  private readonly operators = required<HTMLDivElement>("operator-controls");
  private readonly log = required<HTMLOListElement>("move-log");
  private readonly announcement = required<HTMLDivElement>("game-announcement");
  private readonly undoButton = required<HTMLButtonElement>("undo");
  private readonly redoButton = required<HTMLButtonElement>("redo");
  private readonly restartButton = required<HTMLButtonElement>("restart");
  private readonly columnButtons: HTMLButtonElement[] = [];
  private readonly accessibleBoard = new AccessibleBoard();
  private selectedColumn: number | null = null;

  constructor(private readonly handlers: HudHandlers) {
    for (let col = 0; col < 7; col += 1) {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = String(col + 1);
      button.addEventListener("click", () => handlers.column(col));
      this.columns.append(button);
      this.columnButtons.push(button);
    }
    this.operators.querySelectorAll<HTMLButtonElement>("[data-operator]").forEach((button) => {
      button.addEventListener("click", () => handlers.operator(button.dataset.operator as OperatorKey));
    });
    this.undoButton.addEventListener("click", handlers.undo);
    this.redoButton.addEventListener("click", handlers.redo);
    this.restartButton.addEventListener("click", handlers.restart);
  }

  setSelectedColumn(col: number | null): void {
    this.selectedColumn = col;
  }

  render(state: Readonly<GameState>, cursor: number, recordCount: number, busy: boolean): void {
    const winnerText =
      state.winner === "draw"
        ? "Draw — the board has fully collapsed"
        : state.winner === null
          ? `${playerName(state.turn)} to act · drops |${state.turn}⟩`
          : `${playerName(state.winner)} wins`;
    this.turn.textContent = winnerText;
    this.turn.dataset.player = state.winner === null ? String(state.turn) : "done";

    for (let col = 0; col < this.columnButtons.length; col += 1) {
      const button = this.columnButtons[col];
      if (!button) continue;
      const role = roleAt(state, col);
      button.disabled = busy || !role || state.winner !== null;
      button.dataset.role = role ?? "full";
      button.dataset.selected = String(this.selectedColumn === col);
      button.setAttribute(
        "aria-label",
        role ? `Column ${col + 1}, requires ${role}` : `Column ${col + 1}, full`,
      );
    }

    const selectedRole = this.selectedColumn === null ? null : roleAt(state, this.selectedColumn);
    const needsOperator = selectedRole === "operator" && state.winner === null;
    this.operators.hidden = !needsOperator;
    if (needsOperator && this.selectedColumn !== null) {
      const slot = state.cols[this.selectedColumn]?.find((candidate) => candidate.value === null);
      this.requiredAction.textContent = `Forge column ${this.selectedColumn + 1}`;
      this.operatorHelp.textContent = slot?.ket
        ? `The waiting ket is |${slot.ket.state}⟩. Choose how the next bra will test it.`
        : "Choose an operator.";
    } else if (state.winner !== null) {
      this.requiredAction.textContent = winnerText;
      this.operatorHelp.textContent = "Restart to forge another board.";
    } else {
      this.requiredAction.textContent = "Choose a column";
      this.operatorHelp.textContent = "Build each cell as ket → operator → bra.";
    }

    this.operators.querySelectorAll<HTMLButtonElement>("[data-operator]").forEach((button) => {
      const key = button.dataset.operator as OperatorKey;
      button.title = operatorSummary(key);
      button.disabled = busy;
    });

    this.log.replaceChildren();
    state.log.slice(-10).reverse().forEach((entry, index) => {
      const item = document.createElement("li");
      item.textContent = entry;
      item.value = state.log.length - index;
      this.log.append(item);
    });
    this.undoButton.disabled = busy || cursor === 0;
    this.redoButton.disabled = busy || cursor >= recordCount;
    this.restartButton.disabled = busy;
    this.accessibleBoard.render(state);
  }

  announce(events: readonly GameEvent[]): void {
    const messages = events.map(eventAnnouncement);
    if (messages.length > 0) this.announcement.textContent = messages.join(" ");
  }
}

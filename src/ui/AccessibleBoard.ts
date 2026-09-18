import type { GameState, Slot } from "../engine/types";

function slotLabel(slot: Slot): string {
  if (slot.value !== null && slot.ket && slot.op && slot.bra) {
    const color = slot.value === 1 ? "red" : "blue";
    return `sandwich bra ${slot.bra.state}, operator ${slot.op.key}, ket ${slot.ket.state}, ${color} ${slot.value}`;
  }
  if (!slot.ket) return "empty, awaiting ket";
  if (!slot.op) return `ket ${slot.ket.state}, awaiting operator`;
  return `ket ${slot.ket.state}, operator ${slot.op.key}, awaiting bra`;
}

export class AccessibleBoard {
  private readonly element: HTMLElement;

  constructor() {
    const element = document.getElementById("accessible-grid");
    if (!element) throw new Error("Missing #accessible-grid");
    this.element = element;
  }

  render(state: Readonly<GameState>): void {
    const cells: HTMLElement[] = [];
    for (let r = state.rules.rows - 1; r >= 0; r -= 1) {
      for (let c = 0; c < state.rules.cols; c += 1) {
        const slot = state.cols[c]?.[r];
        if (!slot) continue;
        const cell = document.createElement("span");
        cell.setAttribute("role", "gridcell");
        cell.setAttribute("aria-label", `Column ${c + 1}, row ${r + 1}, ${slotLabel(slot)}`);
        cells.push(cell);
      }
    }
    this.element.replaceChildren(...cells);
  }
}

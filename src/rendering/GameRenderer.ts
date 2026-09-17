import { CanvasRenderer } from "quantum-forge-engine/rendering";
import { roleAt } from "../engine/geometry";
import type { GameEvent, GameState, Half, OperatorPiece, Slot } from "../engine/types";
import {
  BOARD_HEIGHT,
  BOARD_WIDTH,
  BOARD_X,
  BOARD_Y,
  CELL_GAP,
  CELL_SIZE,
  VIEW_HEIGHT,
  VIEW_WIDTH,
  cellPosition,
} from "./layout";

const COLORS = {
  background: "#090b18",
  board: "#171c38",
  cell: "#0c1025",
  border: "#39436e",
  blue: "#55d6ff",
  red: "#ff6685",
  violet: "#b99cff",
  gold: "#ffd166",
  text: "#f4f6ff",
  muted: "#8992b8",
};

function halfColor(half: Half): string {
  return half.state === 0 ? COLORS.blue : COLORS.red;
}

export class GameRenderer extends CanvasRenderer {
  private animationStart = 0;
  private animatedCell: { c: number; r: number } | null = null;
  private stochastic = false;
  private selectedColumn: number | null = null;

  constructor(canvas: HTMLCanvasElement) {
    super({ canvas, maxDpr: 1 });
  }

  setSelectedColumn(col: number | null): void {
    this.selectedColumn = col;
  }

  notify(events: readonly GameEvent[]): void {
    const event = [...events].reverse().find((candidate) =>
      candidate.type === "sandwich-resolved" ||
      candidate.type === "operator-dropped" ||
      candidate.type === "ket-dropped",
    );
    if (!event) return;
    this.animatedCell = event.coord;
    this.animationStart = performance.now();
    this.stochastic = event.type === "sandwich-resolved" && event.stochastic;
  }

  render(state: GameState): void {
    const ctx = this.ctx;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
    ctx.fillStyle = COLORS.background;
    ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);

    this.roundRect(BOARD_X - 18, BOARD_Y - 18, BOARD_WIDTH + 36, BOARD_HEIGHT + 36, 30, COLORS.board, COLORS.border, 2);

    for (let c = 0; c < state.rules.cols; c += 1) {
      const role = roleAt(state, c);
      const selected = this.selectedColumn === c;
      const markerColor = selected ? COLORS.gold : role === "operator" ? COLORS.violet : COLORS.muted;
      ctx.globalAlpha = selected ? 0.24 : 0.1;
      this.roundRect(BOARD_X + c * CELL_SIZE + 8, BOARD_Y - 64, CELL_SIZE - 16, 36, 12, markerColor, markerColor, selected ? 2 : 1);
      ctx.globalAlpha = 1;
      this.text(
        role ? (role === "operator" ? "I · X · H" : role.toUpperCase()) : "FULL",
        BOARD_X + c * CELL_SIZE + CELL_SIZE / 2,
        BOARD_Y - 41,
        markerColor,
        role === "operator" ? 15 : 13,
        800,
      );

      for (let r = 0; r < state.rules.rows; r += 1) {
        const slot = state.cols[c]?.[r];
        if (!slot) continue;
        const { x, y } = cellPosition(c, r);
        this.drawSlot(slot, c, r, x + CELL_GAP / 2, y + CELL_GAP / 2, CELL_SIZE - CELL_GAP);
      }
    }

    ctx.save();
    ctx.translate(30, BOARD_Y + BOARD_HEIGHT - 30);
    ctx.rotate(-Math.PI / 2);
    this.text("KET", 0, 0, COLORS.muted, 11, 800, "left");
    ctx.restore();
    ctx.save();
    ctx.translate(30, BOARD_Y + 30);
    ctx.rotate(-Math.PI / 2);
    this.text("BRA", 0, 0, COLORS.muted, 11, 800, "left");
    ctx.restore();
  }

  private drawSlot(slot: Slot, c: number, r: number, x: number, y: number, size: number): void {
    const age = performance.now() - this.animationStart;
    const isAnimated = this.animatedCell?.c === c && this.animatedCell.r === r && age < 850;
    const pulse = isAnimated ? 0.5 + Math.sin(age / 55) * 0.25 : 0;
    const border = isAnimated ? (this.stochastic ? COLORS.violet : COLORS.gold) : COLORS.border;
    this.roundRect(x, y, size, size, 18, COLORS.cell, border, isAnimated ? 2 + pulse * 3 : 1);

    if (slot.value !== null) {
      const color = slot.value === 1 ? COLORS.blue : COLORS.red;
      const cx = x + size / 2;
      const cy = y + size / 2;
      const radius = 29 + pulse * 3;
      const ctx = this.ctx;
      ctx.beginPath();
      ctx.moveTo(cx, cy - radius);
      ctx.lineTo(cx + radius, cy);
      ctx.lineTo(cx, cy + radius);
      ctx.lineTo(cx - radius, cy);
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,.75)";
      ctx.lineWidth = 2;
      ctx.stroke();
      this.text(String(slot.value), cx, cy + 9, "#07101c", 27, 900);
      return;
    }

    if (slot.ket) this.drawHalf(slot.ket, "ket", x, y, size);
    if (slot.bra) this.drawHalf(slot.bra, "bra", x, y, size);
    if (slot.op) this.drawOperator(slot.op, x, y, size);
  }

  private drawHalf(half: Half, role: "ket" | "bra", x: number, y: number, size: number): void {
    const cx = x + size / 2;
    const ctx = this.ctx;
    ctx.beginPath();
    if (role === "ket") {
      ctx.moveTo(cx - 25, y + size - 30);
      ctx.lineTo(cx + 25, y + size - 30);
      ctx.lineTo(cx, y + size - 7);
    } else {
      ctx.moveTo(cx - 25, y + 30);
      ctx.lineTo(cx + 25, y + 30);
      ctx.lineTo(cx, y + 7);
    }
    ctx.closePath();
    ctx.fillStyle = halfColor(half);
    ctx.fill();
    this.text(
      role === "ket" ? `|${half.state}⟩` : `⟨${half.state}|`,
      cx,
      role === "ket" ? y + size - 31 : y + 29,
      COLORS.text,
      14,
      800,
    );
  }

  private drawOperator(op: OperatorPiece, x: number, y: number, size: number): void {
    const cx = x + size / 2;
    const cy = y + size / 2;
    const color = op.key === "H" ? COLORS.violet : op.key === "X" ? COLORS.gold : COLORS.muted;
    const ctx = this.ctx;
    ctx.beginPath();
    ctx.arc(cx, cy, 21, 0, Math.PI * 2);
    ctx.fillStyle = `${color}33`;
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.stroke();
    this.text(op.key, cx, cy + 8, color, 23, 900);
  }

  private roundRect(
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number,
    fill: string,
    stroke: string,
    lineWidth: number,
  ): void {
    const ctx = this.ctx;
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, radius);
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lineWidth;
    ctx.stroke();
  }

  private text(
    content: string,
    x: number,
    y: number,
    color: string,
    size: number,
    weight: number,
    align: CanvasTextAlign = "center",
  ): void {
    const ctx = this.ctx;
    ctx.fillStyle = color;
    ctx.font = `${weight} ${size}px ui-monospace, SFMono-Regular, Menlo, monospace`;
    ctx.textAlign = align;
    ctx.textBaseline = "alphabetic";
    ctx.fillText(content, x, y);
  }
}

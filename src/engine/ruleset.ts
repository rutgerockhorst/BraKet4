import { BOARD_COLS, BOARD_ROWS, type RuleSet } from "./types";

export const DEFAULT_RULES: RuleSet = Object.freeze({
  cols: BOARD_COLS,
  rows: BOARD_ROWS,
  operators: Object.freeze(["I", "X", "H"] as const),
});

export const BOARD_COLS = 7;
export const BOARD_ROWS = 6;

export type BasisState = 0 | 1;
export type CellValue = BasisState;
export type PlayerId = 0 | 1;
export type OperatorKey = "I" | "X" | "H";
export type Winner = PlayerId | "draw" | null;
export type Coord = { c: number; r: number };

export interface Half {
  id: number;
  state: BasisState;
  owner: PlayerId;
}

export interface OperatorPiece {
  key: OperatorKey;
  owner: PlayerId;
}

export interface Slot {
  ket: Half | null;
  op: OperatorPiece | null;
  bra: Half | null;
  value: CellValue | null;
}

export interface RuleSet {
  readonly cols: number;
  readonly rows: number;
  readonly operators: readonly OperatorKey[];
}

export interface GameState {
  cols: Slot[][];
  turn: PlayerId;
  starter: PlayerId;
  nextId: number;
  winner: Winner;
  winCells: Coord[];
  fresh: Coord | null;
  log: string[];
  moveNo: number;
  rules: RuleSet;
}

export type Move =
  | { kind: "drop"; col: number }
  | { kind: "operator"; col: number; key: OperatorKey };

export type SlotRole = "ket" | "operator" | "bra";

interface PlanBase {
  move: Move;
  coord: Coord;
  player: PlayerId;
}

export type MovePlan =
  | (PlanBase & { stage: "ket"; half: Half })
  | (PlanBase & { stage: "operator"; operator: OperatorPiece })
  | (PlanBase & {
      stage: "bra";
      half: Half;
      ket: Half;
      operator: OperatorPiece;
    });

export type GameEvent =
  | { type: "ket-dropped"; coord: Coord; half: Half }
  | { type: "operator-dropped"; coord: Coord; operator: OperatorPiece }
  | {
      type: "sandwich-resolved";
      coord: Coord;
      operator: OperatorKey;
      measured: BasisState;
      value: CellValue;
      stochastic: boolean;
    }
  | { type: "game-ended"; winner: Exclude<Winner, null>; cells: Coord[] };

export interface TurnRecord {
  move: Move;
  measurements: BasisState[];
}

export interface GameRecord {
  version: 1;
  starter: PlayerId;
  rules: RuleSet;
  turns: TurnRecord[];
}

export type Result<T> =
  | { ok: true; value: T }
  | { ok: false; error: string };

export interface CommitResult {
  state: GameState;
  events: GameEvent[];
  record: TurnRecord;
}

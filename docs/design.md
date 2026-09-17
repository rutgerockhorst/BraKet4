# ⟨4|in a bracket row⟩ — code outline & development spec

Version 0.3 · target audience: AI coding agents picking up individual work packages.

## 1. The game in one paragraph

Connect-4 gravity on a 7×6 grid, except every cell is a quantum sandwich with three stages: ket `|y⟩` (bottom half, ▽), operator `A`, then bra `⟨x|` (top half, △). The game chooses the required stage from the selected column. At a ket or bra stage the player drops their state—Blue always drops `|0⟩`, Red always drops `|1⟩`; at an operator stage the player chooses unlimited `I`, `X`, or `H`. A completed cell resolves to `|⟨x|A|y⟩|²`: `1` becomes a blue diamond, `0` a red diamond, and `½` is measured immediately. Blue wins with four blue `1`s in a row; Red wins with four red `0`s. The operator turn breaks the original parity trap and makes each cell a tactical conundrum rather than a forced closure.

## 2. Design findings that must not be regressed

### 2.1 The two-stage base game is a forced Red win

With basis-only `⟨x|y⟩` play, a blue diamond requires identical states. Because each player owns one basis state, that requires one player to fill both halves. Alternating turns let Red answer every Blue ket with a Red bra; all completed cells become red and an all-red board necessarily contains four in a row. Self-play confirmed Blue 0 / Red 300.

Coherence tokens were previously used to block some opponent closures. They softened the problem but created a sharp counting race: shallow matched bots moved from 69/29 Blue/Red at 15 tokens to 31/69 at 16. Coherence is therefore retained only as a legacy `RuleSet` experiment, not as the default game.

### 2.2 Selected fix: a mandatory operator sandwich

Every cell now resolves in exactly three placements:

1. ket,
2. one chosen operator,
3. bra and measurement.

The core operators `I`, `X`, and `H` are unlimited and available to both players. Optional operators and limited inventories were simulated and did not fix the color degeneracy: once scarce operators ran out, the game returned to its parity bias. Making the operator stage mandatory and its core choices unlimited produced the first promising matched-agent result.

Preliminary expectiminimax self-play, with 5% exploratory choices:

| Search | Starter | Blue | Red | Draw |
|---|---|---:|---:|---:|
| 2 plies | Blue | 44.5% | 48.5% | 7.0% |
| 2 plies | Red | 52.0% | 36.0% | 12.0% |
| 3 plies | Blue | 46.0% | 52.0% | 2.0% |
| 3 plies | Red | 50.0% | 48.0% | 2.0% |

The depth-3 sample was 50 games per starter. Combined, it produced Blue 48%, Red 50%, draws 2%, and a 47% first-player win rate. This meets the initial 55/45 point-estimate target but is not yet a final balance proof.

A search depth is measured in plies, where one ply is one player action. Depth 2 sees an action and the opponent's reply. Depth 3 sees the next action as well—enough to see a complete ket → operator → bra sequence in the common case. The weaker depth-2 result is therefore strongly affected by an odd/even horizon artifact. Production search and balance tests must extend leaf nodes until the currently active sandwich resolves (“resolution quiescence”), and final validation must use larger samples at multiple full-sandwich depths.

Fairness acceptance criteria:

- Among decisive games, Blue/Red and first/second player splits must each be within 55/45.
- Results must be reported separately for Blue-start and Red-start games, with draws and 95% confidence intervals.
- The criterion must hold for at least three matched strengths using resolution-quiescent search, not raw 1/2/3-ply search.
- Single games randomize the starter; a match series alternates it.

### 2.3 Colour = state, not owner

Halves are colored by their prepared state, not by the player who placed them: `|0⟩` is blue and `|1⟩` is red. Resolved diamonds are colored by payoff: value `1` is blue and value `0` is red. A state under an unresolved `H` is violet/shimmering. Ownership is retained for history and statistics, but does not determine a piece's color.

### 2.4 Quantum Forge is the runtime backend

“Quantum Forge” means the installed `quantum-forge` 2.7.0 simulator and `quantum-forge-engine` 1.4.0 framework. The browser game uses the Qubit WASM build. Pure symbolic arithmetic remains available for AI, balance tests, and graceful fallback, but live quantum gates and measurements use Quantum Forge.

Quantum Forge has no seeded measurement API. Live games therefore use normal probabilistic measurement and record the outcome in a `TurnRecord`. Replay may force that recorded outcome. Multiplayer will require an authoritative `MoveResolved` event rather than assuming separate clients can reproduce a live measurement from a shared seed.

## 3. Architecture

```text
/src
  /engine                   pure domain, zero DOM and zero WASM
    types.ts                State, Slot, Half, OperatorPiece, Move, TurnRecord
    ruleset.ts              default and experimental rules
    state.ts                newState, invariants, serialisation
    geometry.ts             landingSlot, roleAt
    moves.ts                validate/plan/commit
    resolution.ts           sandwich probabilities and outcome commit
    operators.ts            operator definitions and legal choices
    win.ts                  settle and line scanning
    replay.ts               turn records → state
  /quantum
    QuantumRuntime.ts       game-facing adapter
    ForgeQuantumRuntime.ts  Quantum Forge gates, measurement, pooling
    SymbolicQuantumRuntime.ts exact AI/test model
    circuits.ts             I/X/H and future Bell circuits
  /game
    BracketGameEngine.ts    Quantum Forge Engine state coordinator
    GameController.ts       input → plan → quantum effect → commit
  /rendering
    GameRenderer.ts         Pixi board and effects
    animations.ts
    layout.ts
  /ui
    HudView.ts AccessibleBoard.ts theme.css
  /ai
    evaluate.ts search.ts quiescence.ts personas.ts selfPlay.ts
  /net                      optional, phase 3
    room.ts protocol.ts
/test
  engine/ quantum/ integration/ ai/
```

Hard rules for agents:

- `/engine` never imports from `/ui`, `/rendering`, or Quantum Forge.
- Pure rules never call `Math.random`; measurement results are explicit inputs.
- WASM handles live only in `ForgeQuantumRuntime`, keyed by domain IDs.
- Renderers never decide legality or outcomes.

## 4. Data model

```ts
type BasisState = '0' | '1';
type PlayerId = 0 | 1;                 // 0 = Blue, 1 = Red
type OperatorKey = 'I' | 'X' | 'H';

interface Half {
  id: number;
  state: BasisState;
  owner: PlayerId;
}

interface OperatorPiece {
  key: OperatorKey;
  owner: PlayerId;
}

interface Slot {
  ket: Half | null;                    // placed first
  op: OperatorPiece | null;            // placed second
  bra: Half | null;                    // placed third
  value: 0 | 1 | null;                 // classical result after measurement
}

interface GameState {
  cols: Slot[7][6];                    // cols[c][r], r = 0 at bottom
  turn: PlayerId;
  starter: PlayerId;
  nextId: number;
  winner: PlayerId | 'draw' | null;
  winCells: [number, number][];
  fresh: { c: number; r: number } | null;
  log: string[];
  moveNo: number;
  rules: RuleSet;
}

type Move =
  | { kind: 'drop'; col: number }      // ket or bra, selected automatically
  | { kind: 'operator'; col: number; key: OperatorKey };

interface TurnRecord {
  move: Move;
  measurements: (0 | 1)[];            // empty for deterministic turns
}
```

`Move` is the player command. `TurnRecord` is the replay/network resolution envelope required for genuine Quantum Forge measurements. Planning a move and committing explicit outcomes must remain total and pure.

## 5. Rules engine — formal spec

### 5.1 Geometry and legal actions

`landingSlot(s,c)` is the lowest row that is not resolved; if all six cells are resolved, return `-1`.

For that slot:

```text
ket === null                  → role 'ket'
ket !== null && op === null   → role 'operator'
op !== null && bra === null   → role 'bra'
```

- At a ket or bra role, the only action for that column is `{kind:'drop'}`.
- At an operator role, the legal actions are `{kind:'operator', key:'I'|'X'|'H'}`.
- A player may choose any non-full column whose required role matches the submitted move.
- Every valid action consumes one turn, including an operator.

### 5.2 Sandwich table

The completed cell is:

```text
|⟨bra| op |ket⟩|²
```

For basis-state halves:

| Operator | Same halves (`0/0`, `1/1`) | Different halves (`0/1`, `1/0`) |
|---|---:|---:|
| `I` | 1 | 0 |
| `X` | 0 | 1 |
| `H` | ½ | ½ |

Thus `I` rewards matching halves, `X` rewards mismatched halves, and `H` refuses to reveal a deterministic preference until measurement.

### 5.3 Resolution order

1. Validate the bra drop and create its `Half`.
2. Apply the stored operator to the waiting ket's Quantum Forge property.
3. Measure in the bra's basis.
4. Set `value = 1` when the measurement matches the bra, otherwise `0`.
5. Release the resolved ket property from the quantum registry.
6. Scan for a win, then check for a full-board draw.
7. Pass the turn only if the game remains active.

`I` and `X` resolutions are deterministic for basis inputs. `H` consumes exactly one live measurement.

### 5.4 Win

Scan all cells in four directions for four equal non-null values. `value === 1` means Blue wins; `value === 0` means Red wins, including when the mover completes the opponent's line. Only one diamond is created per turn, so simultaneous wins are impossible. A full resolved board with no line is a draw.

## 6. Operators

### 6.1 Core, unlimited operators

| Key | Name | Quantum Forge gate | Tactical purpose |
|---|---|---|---|
| `I` | Identity | no gate | Preserve the ket; reward equal halves. |
| `X` | Bit Flip | discrete `x`/`shift` | Invert the ket; reward unequal halves. |
| `H` | Hadamard | discrete `hadamard` | Force a visible 50/50 measurement for basis halves. |

These are board pieces, not cards, and have no inventory cost. Unlimited access is part of the balance fix.

### 6.2 Experimental operators

Additional real or fictional operators must be added behind `RuleSet` flags and pass the same fairness suite before becoming defaults. Promising directions include:

- `Z`/phase operators, but only alongside a mechanic that later converts phase into interference; on isolated basis inputs `Z` is not an interesting choice.
- A Bell/fork operator that links two waiting kets and creates a non-local conundrum.
- A fictional bias operator implemented by a fractional gate, clearly displaying its odds.
- Measurement or operator-copy effects, provided they do not restore a finite-resource counting race.

The previous `H`, `X`, `Z`, `M`, and `E` card hand is not part of the default rules. Those effects may return later as tested operator variants.

## 7. Work packages

### A. Engine hardening

- **A1:** Implement the pure three-stage engine and the tests in §8.
- **A2:** Separate `planMove` from `commitMove(measurements)` so invalid moves cannot mutate the Quantum Forge registry.
- **A3:** Versioned `TurnRecord` replay, undo/redo by prefix rebuild, and compact position encoding.

### B. Balance

- **B1:** Port the exploratory self-play harness to the production symbolic engine and reproduce §2.2 with 95% confidence intervals.
- **B2:** Add resolution quiescence so a leaf inside a ket/operator/bra sequence extends through the next completed cell.
- **B3:** Validate the 55/45 color and starter criteria with at least 1,000 games per starter at three matched strengths. Report draws separately.
- **B4:** Tune board size or operator set only if B3 fails. Do not reintroduce coherence into the default merely to tune a percentage.

### C. AI opponent

- **C1:** Expectiminimax over both drop and operator moves, with chance nodes for `H`.
- **C2:** Evaluate line threats, unresolved sandwich control, operator tempo, and expected cell value.
- **C3:** Difficulty/personality presets should differ in operator style as well as search budget.

A nominal “depth 2” is not a meaningful strong preset for this game unless resolution quiescence is enabled.

### D. UI/UX

- **D1:** Distinct ket, operator, and bra drop animations.
- **D2:** `H` collapse animation: shimmer → measurement → diamond.
- **D3:** Show the current required role over every playable column and preview all three operator outcomes.
- **D4:** Large touch targets and keyboard `1`–`7`; when an operator is required, expose `I`, `X`, and `H` as an accessible choice.
- **D5:** Per-cell aria labels such as “column 3, row 2, sandwich bra 0, X, ket 1, blue 1.”

### E. Content and meta

- **E1:** Tutorial positions for stage order, `I`, `X`, `H`, operator tempo, and opponent-color wins.
- **E2:** Search-generated “win in N” puzzles.
- **E3:** Stats for diamonds by color, operator usage, expected value, and starter/color results.

### F. Multiplayer

- **F1:** Authority accepts a `Move`, performs live measurement when needed, and broadcasts `MoveResolved` with outcomes.
- **F2:** Reconnect from ordered `TurnRecord`s; add rooms and spectators.

## 8. Test cases — write these first

| # | Setup | Expected |
|---:|---|---|
| 1 | Drop into empty column | Ket at `r=0`, operator and value null, turn passes. |
| 2 | Submit another drop to a ket-only landing slot | Rejected because an operator is required; state unchanged. |
| 3 | Place `I` on waiting ket | Operator stored, no measurement, turn passes. |
| 4 | Submit an operator to an empty or operator-filled slot | Rejected; state unchanged. |
| 5 | `⟨0|I|0⟩` or `⟨1|I|1⟩` | Value 1, no random measurement. |
| 6 | `⟨0|I|1⟩` or `⟨1|I|0⟩` | Value 0, no random measurement. |
| 7 | Equal halves with `X` | Value 0. |
| 8 | Different halves with `X` | Value 1. |
| 9 | Any basis sandwich with `H` | Exactly one measurement; both outcomes reachable. |
| 10 | Completed bottom slot, next play in column | Starts the ket of the next row. |
| 11 | Move completes four of opponent's value | Opponent wins immediately. |
| 12 | Full resolved board without line | Draw. |
| 13 | Replay recorded `H` outcome | Every state prefix deep-equals the live game. |
| 14 | Same position with starter labels swapped | Legal move set is structurally identical. |
| 15 | Quantum Forge Φ behavior is not enabled in core rules | No cell can acquire an entanglement group accidentally. |

## 9. Open design questions

- Do final 1,000-game, resolution-quiescent runs confirm the preliminary fairness result at three strengths?
- Is 7×6 too long now that a cell can require three actions? Test 7×5 and 6×5 only after the core rules are stable.
- Which additional operator adds a new decision rather than duplicating `I`, `X`, or `H` probabilities?
- Should `H` collapse immediately on bra placement or remain pending until a line is claimed? Immediate collapse is the default.
- Should a competitive match be best-of-two with colors and starters swapped, even if single-game first-mover results remain balanced?
- Naming candidates remain Braket 4, Collapse 4, Four in a Bra-Ket, and ⟨4|in a bracket row⟩.

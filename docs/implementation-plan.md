# Core-first Quantum Forge implementation plan

## 1. Selected game

Implement the version 0.3 rules in [`design.md`](design.md): each gravity cell is completed as **ket → operator → bra**. Blue drops `|0⟩` halves, Red drops `|1⟩` halves, and the player acting at the middle stage chooses unlimited `I`, `X`, or `H`. The resolved value is `|⟨bra|operator|ket⟩|²`; four `1`s wins for Blue and four `0`s wins for Red.

The mandatory operator is the balance mechanic, not an optional power-up. The previous coherence economy and finite card hand are legacy variants and must not leak into the default implementation.

Initial assumptions:

- Browser-first TypeScript.
- Quantum Forge core 2.7.0 and engine 1.4.0, as locked.
- Qubit edition.
- 7×6 board until measured game length justifies a change.
- Random starter for a single game and alternating starter for a series.
- Local hot-seat first, then AI and networking over the same move contract.

## 2. Fairness interpretation

A search depth is a count of **plies**, and one ply is one player action. Depth 2 sees “my action, your reply.” Depth 3 sees one action farther, which is often the first depth capable of seeing a complete ket → operator → bra cell. The depth-2 imbalance observed in the exploratory simulations is therefore partly a horizon artifact: the evaluator is asked to judge unresolved sandwiches immediately before their payoff appears.

Production search must use **resolution quiescence**: if a nominal leaf is inside an active sandwich, extend it until the next cell resolves. Compare matched agents at at least three complete-sandwich budgets—for example 3, 6, and 9 nominal plies plus quiescence—rather than treating raw depth 1/2/3 as equivalent measures of skill.

Fairness is a release gate:

- Blue versus Red decisive wins: 45–55%.
- First versus second player decisive wins: 45–55%.
- Blue-start and Red-start results reported separately.
- Draws and 95% confidence intervals reported, not silently split between players.
- At least 1,000 games per starter at each of three matched strengths.

The preliminary depth-3 result—Blue 48%, Red 50%, draws 2%, first player 47% when both starters are combined—is promising, not conclusive.

## 3. Quantum measurement and replay contract

Quantum Forge does not expose a seeded measurement RNG. Normal `measure_properties()` is probabilistic, while forced measurement is intended for tests and replay.

Use this contract:

- Live local play performs normal Quantum Forge measurement.
- `Move` is the player's command.
- `TurnRecord` stores the move plus resulting measurement outcomes.
- Replay rebuilds the game from turn records and may force recorded outcomes.
- Multiplayer eventually sends `MoveCommand` to an authority and receives `MoveResolved` with outcomes.
- Forced measurement never chooses a live outcome.

This preserves genuine Quantum Forge behavior while keeping replay deterministic.

## 4. Core loop

Every turn follows one transaction:

1. Find the selected column's lowest unresolved cell.
2. Derive its required role: ket, operator, or bra.
3. Validate that the submitted move matches that role.
4. For a ket, prepare the player's basis state in the quantum registry.
5. For an operator, store the selected `I`, `X`, or `H`; do not apply it early.
6. For a bra, apply the stored operator to the ket, measure in the bra's basis, and commit the diamond.
7. Settle win before draw, then pass the turn if play continues.
8. Emit presentation events and append a `TurnRecord`.

A failed validation performs no quantum operation and changes no state.

## 5. Architecture

```text
src/
  engine/                       # pure domain; no UI or Quantum Forge imports
    types.ts
    ruleset.ts
    state.ts
    geometry.ts
    moves.ts                    # validate, plan, immutable commit
    resolution.ts
    operators.ts
    win.ts
    events.ts
    replay.ts
    serialise.ts
  quantum/
    QuantumRuntime.ts
    ForgeQuantumRuntime.ts
    SymbolicQuantumRuntime.ts   # AI, balance, deterministic tests/fallback
    circuits.ts
    lifecycle.ts
  game/
    BracketGameEngine.ts        # Quantum Forge Engine coordinator
    GameController.ts           # transaction boundary
  rendering/
    GameRenderer.ts             # PixiRenderer
    layout.ts
    animations.ts
  ui/
    HudView.ts
    AccessibleBoard.ts
    theme.css
  input/
    bindings.ts
  ai/
    evaluate.ts
    search.ts
    quiescence.ts
    personas.ts
    selfPlay.ts
  main.ts

test/
  engine/
  quantum/
  integration/
  ai/
```

### Boundaries

- `src/engine` is total, immutable, and deterministic given explicit outcomes.
- `ForgeQuantumRuntime` owns every WASM property; `GameState` contains only serializable IDs and labels.
- `BracketGameEngine` extends `Engine<GameState>` but contains no rules.
- `GameController` validates first, invokes the quantum runtime second, and commits third.
- Rendering consumes committed state plus presentation-only animation events.
- AI and large self-play runs use exact symbolic probabilities, not thousands of WASM simulations.

## 6. Quantum Forge mapping

| Game concept | Quantum Forge implementation |
|---|---|
| Blue ket | Acquire a qubit in `|0⟩`. |
| Red ket | Acquire and apply discrete `x`/`shift` to reach `|1⟩`. |
| `I` sandwich | No gate; measure the ket in the computational basis. |
| `X` sandwich | Apply discrete `x`, then measure in the computational basis. |
| `H` sandwich | Apply discrete `hadamard`, then measure in the computational basis. |
| Bra comparison | Value is 1 when the measured bit equals the bra's basis value, otherwise 0. |

For basis-state halves, `I` rewards equal halves, `X` rewards unequal halves, and `H` gives ½ for every pairing.

Lifecycle:

- At most seven persistent ket properties exist—one per column.
- An operator is classical until the bra arrives; storing it does not need a qubit.
- Resolved kets follow measure → delete mapping → release to pool.
- Reset, undo, and replay clear and rebuild the registry from a turn-record prefix.
- Query one property at a time in the core game.
- Keep future entanglement groups capped at two and behind a tested `RuleSet` extension.

## 7. Delivery rings

### Ring 0 — Foundation and circuit proof

Deliver:

- Add Vite, TypeScript, Vitest, and PixiJS without overwriting project documentation.
- Configure `quantumForgeVitePlugin()` and ESM.
- Call `useQuantumForgeBuild("qubit")` before `ensureLoaded()`.
- Configure the absolute Qubit WASM path for headless tests.
- Display loading/error states and visible `getAttribution()` text.
- Prove `I`, discrete `X`, and `H` sandwich probabilities headlessly.

Exit criteria:

- Browser and Node load the Qubit WASM build.
- Exact queries produce the full operator table from `design.md`.
- Deterministic sandwiches have one supported outcome; `H` has 50/50 support.
- A short recorded measurement can be replayed exactly.

### Ring 1 — Pure three-stage rules

Write the design tests first, then implement:

- Default state and `RuleSet`.
- Lowest-unresolved-cell geometry and ket/operator/bra role derivation.
- Move validation and planning.
- Immutable ket placement, operator placement, and explicit-outcome bra commit.
- Win/draw settlement and domain events.
- Configurable starter with no color-specific legality branches.

Exit criteria:

- All deterministic cases in `design.md` §8 pass.
- Invalid stage/action combinations leave frozen input state unchanged.
- Swapping only the starter does not change the structural legal move set.
- No coherence, hand, or card code exists in the default path.

### Ring 2 — Minimum playable quantum loop

Deliver:

- `ForgeQuantumRuntime` preparation, deferred operator application, measurement, and pooling.
- `BracketGameEngine` and controller transaction flow.
- Pixi board showing all three cell stages.
- Operator chooser shown only when the selected column requires it.
- Mouse/touch, keyboard column selection, accessible controls, restart, and local hot-seat.
- Ket/operator/bra drop animation and visible `H` collapse.

Exit criteria:

- A complete game can be played from load to win/draw.
- `I` and `X` resolve without stochastic presentation; `H` visibly measures once.
- A rejected move never touches the registry.
- Every completed cell matches the pure symbolic result.

### Ring 3 — Replay, undo, and sharing

Deliver:

- Versioned `TurnRecord` and `GameRecord` formats.
- Registry rebuild from any turn prefix.
- Undo/redo as cursor movement and rebuild, not mutable snapshots.
- Compact position encoding for bug reports and puzzles.
- Optional `QuantumRecorder` diagnostics, attached before acquisition with gates recorded explicitly.

Exit criteria:

- Every replay prefix deep-equals the original classical state.
- Replayed unresolved kets have the expected exact probabilities.
- Recorded `H` outcomes reproduce without a fresh random choice.

### Ring 4 — Fairness harness and AI

Implement fairness before adding more operators:

1. Port the exploratory harness to the production symbolic engine.
2. Add expectiminimax over drop and operator moves.
3. Add `H` chance nodes.
4. Add resolution quiescence.
5. Evaluate resolved threats, expected sandwich value, column control, and operator tempo.
6. Run both starter assignments at three matched strengths.

Exit criteria:

- The harness reproduces the preliminary depth-3 result within its confidence interval.
- At least 1,000 games per starter are reported at each strength.
- Color and move-order decisive splits satisfy 55/45 or better.
- Results include average game length and operator usage.
- If the gate fails, tune board geometry or the core operator set and rerun; do not hide imbalance with asymmetric inventories.

Depth-4 defeating depth-2 is no longer a useful standalone AI criterion because raw even/odd depths see different fractions of a sandwich. Compare quiescent search budgets or count completed resolution horizons instead.

### Ring 5 — Operator expansion

Only after Ring 4 passes, prototype additional operators behind independent `RuleSet` flags:

- `Z` plus a later interference mechanic.
- Bell/fork entanglement between waiting kets.
- A clearly labeled fractional or fictional bias operator.
- Measurement/copy operators.

Each prototype needs a circuit invariant, UI preview, AI support, and a fresh fairness report. No experimental operator enters the default set merely because it is thematic.

### Ring 6 — UX, accessibility, and content

Deliver:

- Required-stage markers above columns.
- Previews explaining `I`, `X`, and `H` for the current ket and possible next bra.
- Threat overlay and responsive drag/tap hit areas.
- Per-cell aria labels, focus rings, reduced motion, and color-blind shapes.
- Tutorials for stage order and operator decisions.
- Search-generated puzzles and operator/starter statistics.

Exit criteria:

- Full keyboard and screen-reader-oriented operation.
- Randomness is announced before settling.
- State remains legible without color or animation.

### Ring 7 — Multiplayer and release

Deliver:

- Authoritative measurement protocol using `MoveCommand` and `MoveResolved`.
- Rooms, ordering, reconnect from turn records, and spectators.
- Offline WASM caching, production error handling, and build checks.
- Final installed-license review and persistent visible Quantum Forge attribution.

Exit criteria:

- Clients cannot diverge after `H` measurement.
- Reconnect reconstructs classical state and waiting quantum properties.
- Stale or illegal moves do not touch the registry.

## 8. Test strategy

- **Pure unit tests:** geometry, stage legality, all eight deterministic `I`/`X` basis cases, outcome commit, settlement, serialization, and replay.
- **Quantum headless tests:** exact pre-measurement probabilities, invariant-based `H` trials, and pool size after long games.
- **Integration tests:** controller transactions with scripted outcomes and rollback on invalid actions.
- **UI tests:** role marker, operator chooser, hit testing, keyboard operation, aria labels, and animation input lock.
- **Balance tests:** seeded symbolic games with Wilson confidence intervals; slow 1,000-game suites separated from commit tests.
- **End-to-end smoke:** load WASM, complete an `I`, `X`, and `H` sandwich, undo, replay, and restart.

CI runs typecheck, lint, fast tests, production build, and one headless Quantum Forge smoke test on each change. Large self-play matrices run on demand or on a schedule.

## 9. First shippable milestone

The first shippable build must include the complete local ket → operator → bra loop, all three core operators, genuine Quantum Forge `H` measurement, replayable outcomes, keyboard/touch access, visible attribution, and a passing fairness report at the required matched strengths. Extra operators, entanglement, tutorials, and networking come afterward.

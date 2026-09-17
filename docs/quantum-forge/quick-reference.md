# Quantum Forge quick reference

Use this as the default context for Quantum Forge work. It is intentionally compact. Follow the task-specific links in [`source-map.md`](source-map.md) when an implementation needs more detail.

## What the toolkit is

Quantum Forge provides a compiled C++ quantum simulator through WASM for TypeScript/Web and native integration for Unity. Its state uses complex amplitudes—not independent calls to `Math.random()`—so gates can produce superposition, entanglement, phase, and interference.

A useful game-programming model:

- A **quantum property** is one qudit with `d` basis values.
- A **superposition** is a weighted collection of basis states. The weights are complex amplitudes; outcome probability is amplitude magnitude squared.
- A **gate** transforms amplitudes without measuring.
- A **predicated gate** transforms only matching basis states and can entangle its controls and targets.
- **Measurement** samples a basis value and collapses the shared state.
- **Phase** does not alter immediate basis probabilities, but later gates can turn phase differences into probability differences through interference.

## Platform and edition choices

This repository currently pins `quantum-forge` 2.7.0 and `quantum-forge-engine` 1.4.0 in `package-lock.json`. See the [installed-package audit](installed-package-audit.md) before using bundled examples: several README/context snippets do not match these releases' declarations.

### TypeScript/Web

Recommended scaffold:

```bash
npx quantum-forge-engine init my-game
```

For a non-interactive agent/CI run, provide every answer:

```bash
npx -y quantum-forge-engine init my-game \
  --template starter --platforms web --edition qutrit --no-claude-skill
```

- `quantum-forge`: quantum core.
- `quantum-forge-engine`: game framework and CLI; includes the core.
- Packages are ESM-only.
- `starter` supplies Vite, TypeScript, pure logic modules, an Engine subclass, Pixi rendering, a controller, and a test.
- `quantum-pong` is the larger worked example.
- A bare `npm install quantum-forge-engine` does not scaffold Vite, tests, or application files. Its rendering/audio peers (`pixi.js`, `howler`) are optional and are not present in this repository yet.

Editions:

| Edition | Dimensions | Max qudits | Choose when |
|---|---:|---:|---|
| Qutrit (default) | 2–3 | 12 | Any mechanic needs three basis values |
| Qubit | 2 only | 20 | Mechanics are binary and need more active quantum objects |

For the Qubit edition, call `useQuantumForgeBuild("qubit")` **before** `ensureLoaded()`. The shipped public builds do not support dimensions above 3.

### Unity

Install with Unity Package Manager from:

```text
https://github.com/quantum-native/quantum-forge-unity.git
```

Pin releases with `#unity-vX.Y.Z`. The main inspector workflow is: create a `Basis` ScriptableObject, attach `QuantumProperty`, add action components, wire `apply()` to interactions, and optionally add `ProbabilityTracker`.

## TypeScript initialization

Configure Vite:

```ts
import { defineConfig } from "vite";
import { quantumForgeVitePlugin } from "quantum-forge/vite-plugin";

export default defineConfig({
  plugins: [quantumForgeVitePlugin()],
  build: {
    rollupOptions: {
      external: [/quantum-forge-web-api/],
    },
  },
});
```

Load WASM before quantum work:

```ts
import {
  ensureLoaded,
  QuantumPropertyManager,
} from "quantum-forge/quantum";

await ensureLoaded();
const qpm = new QuantumPropertyManager({ dimension: 2 });
```

`startBackgroundLoad(logger)` can preload during idle time; still await `ensureLoaded()` before first use. `setWasmBasePath(...)` and `useQuantumForgeBuild(...)` must run before loading.

## Core property lifecycle

```ts
const prop = qpm.acquireProperty(); // always starts in |0⟩
qpm.setProperty("ball-1", prop);
const sameProp = qpm.getProperty("ball-1");
const m = qpm.getModule();
```

Normal gameplay lifecycle:

```ts
const [value] = m.measure_properties([prop]);
qpm.deleteProperty("ball-1");
qpm.releaseProperty(prop, value); // resets to |0⟩ and pools it
```

Pool aggressively. `removeProperty(id)` is the manager convenience that measures, deletes, and releases. A lost JavaScript reference does **not** remove its qudit from WASM state.

If no result is needed, `prop.destroy()` factorizes the qudit out and shrinks the state. Destroying an entangled property measures it and collapses partners; uncompute first when that is not intended. Never use a destroyed property without checking `prop.is_valid()`—post-destroy misuse may trap WASM rather than throw a catchable error.

## Gates: exact calling rules

All WASM methods use snake_case and are reached through `getModule()`.

| Gate | Signature | Notes |
|---|---|---|
| Cycle | `m.cycle(p, fraction?, predicates?)` | Increment basis value mod `d` |
| Shift / X | `m.shift(...)`, `m.x(...)` | Decrement mod `d`; inverse of cycle |
| Hadamard | `m.hadamard(...)` | Creates/mixes superposition |
| Inverse H | `m.inverse_hadamard(p, predicates?)` | No fraction |
| Clock / Z | `m.clock(...)`, `m.z(...)` | Changes phase |
| Y | `m.y(...)` | Dimension 2 only |
| iSwap | `m.i_swap(a, b, fraction, predicates?)` | Fraction required; entangling |
| Swap | `m.swap(a, b, predicates?)` | No fraction; state exchange |
| Phase rotate | `m.phase_rotate(predicates, angle)` | Predicates first and required |

Critical distinction: omitting `fraction` selects a discrete gate; passing `1.0` selects a continuous fractional gate at full strength. They are different operations. For a predicated discrete gate, preserve the empty fraction slot:

```ts
m.shift(target, undefined, [control.is(1)]);
```

Predicates use `prop.is(value)` or `prop.is_not(value)`. Multiple predicates are ANDed. A target cannot also be one of its gate's controls. An empty `phase_rotate` predicate list is a silent no-op.

At dimension 2, cycle and shift both flip 0/1. At dimension 3, cycle maps `0→1` while shift/X maps `0→2`.

## Canonical quantum mechanics

### Equal superposition

```ts
const p = qpm.acquireProperty(); // |0⟩
m.hadamard(p);                   // (|0⟩ + |1⟩)/√2
```

Starting from `|1⟩` instead gives the relative-minus state:

```ts
m.cycle(p);    // |1⟩
m.hadamard(p); // (|0⟩ - |1⟩)/√2
```

### Positively correlated pair (CNOT pattern)

```ts
const control = qpm.acquireProperty();
const target = qpm.acquireProperty();
m.hadamard(control);
m.shift(target, undefined, [control.is(1)]);
// (|00⟩ + |11⟩)/√2: outcomes always match
```

### Anti-correlated split (iSwap pattern)

Start from definite `|10⟩`; do not put both properties into independent superpositions first:

```ts
const a = qpm.acquireProperty();
const b = qpm.acquireProperty();
m.cycle(a);             // |10⟩
m.i_swap(a, b, 0.5);   // (|10⟩ + i|01⟩)/√2
// Exactly one measures as 1
```

### Phase and interference

```ts
m.clock(a, phaseFraction); // probabilities unchanged now
m.i_swap(a, b, 0.5);       // converts relative phase into probability bias
```

Use phase as a player control knob: players influence later odds without selecting an outcome directly. For oracle-style marking, use `m.phase_rotate(predicates, Math.PI)` followed by a mixing/diffusion gate.

## Measurement and non-collapsing queries

```ts
const outcomes = m.measure_properties([a, b]);
const distribution = m.probabilities([a]);
const rdm = m.reduced_density_matrix([a, b]);
const predicateChance = m.predicate_probability([a.is(1), b.is(0)]);
const projected = m.measure_predicate([a.is(1), b.is(0)]);
```

- `measure_properties` collapses; batch measurement preserves correlations.
- `probabilities` does not collapse and always takes an array.
- Reduced-density-matrix off-diagonal entries expose phase/coherence.
- `measure_predicate` projects onto a matching/nonmatching subspace rather than fully selecting a basis state.
- Forced measurement APIs are for replay/tests, not normal gameplay.

Important query caveat: multi-property `probabilities`, `reduced_density_matrix`, and cross-property predicate queries tensor separate state vectors together. That can permanently enlarge later work or hit the state-size guard. Query one property at a time unless joint state is needed or the properties are already entangled.

## Performance and failure policy

State growth is exponential. The expensive event is tensoring previously separate states, commonly when `i_swap` or a predicated gate first connects them.

Rules:

1. Measure, delete, and release properties promptly so handles are reused from the pool.
2. Keep concurrently quantum objects deliberately bounded.
3. Use dimension 2 unless a three-state mechanic is essential.
4. Keep quantum systems that never interact in separate registries/simulations.
5. Throttle visual probability/RDM reads; they rarely need frame-rate updates.
6. Use `executeBatch()` for many gates and `executeBatchTape()` only for measured high-throughput needs.
7. Treat quantum effects as gracefully degradable if the state budget is exhausted.

Budget methods are on properties:

```ts
prop.num_active_qudits();
prop.state_vector_size();
```

Global queries include `getMaxDimension()`, `getMaxQudits()`, and `getMaxStateSize()` (currently 100,000 amplitudes). `getWasmMemoryBytes()` currently returns `null`; do not build monitoring around it. In core 2.7.0, the qutrit runtime's `getVersion()` returns `".."`, so use the lockfile/package metadata for version reporting.

Catch typed errors by message prefix:

- `[QuantumForgeStateSizeError]`: proposed tensor/state is too large; the rejected operation leaves original separate states untouched.
- `[QuantumForgeOutOfMemoryError]`: WASM allocation failed.
- `[QuantumForgeError]`: invalid operation, cross-simulation mixing, target/control overlap, etc.

Release any newly acquired unused property when falling back. Re-throw unexpected errors.

## Isolated simulations

Use `getQuantumForge().createSimulation()` for search branches, replay branches, or tests that must not contaminate global state. Create properties with `sim.createProperty(dimension)`, but continue to get gates from `getModule()`; there is no `sim.getModule()`.

Properties from different simulations cannot be entangled. `sim.destroy()` invalidates every owned property. Use `sim.destroyProperty(prop)` for incremental cleanup and `sim.factorizeAllSeparable()` after undoing entanglement.

## Recording and replay

WASM state is not directly serializable. `QuantumRecorder` logs operations and forces recorded measurement outcomes during replay:

```ts
const recorder = new QuantumRecorder(qpm);
qpm.setRecorder(recorder);
recorder.startRecording(); // start before acquiring replayed properties
// lifecycle calls are automatic; gate calls require recordOp(...)
const log = recorder.stopRecording();
recorder.replayLog(log);
```

Use `getOperationLog()` for a snapshot while still recording; there is no `getLog()`. A property acquired before recording has no replayable acquire event. Read the recording deep dive before implementing save/load: gate logging and the exact-`1.0` fractional replay edge case need deliberate handling.

## Headless test setup

Bare Node has no Vite route for WASM. Use an absolute filesystem path before loading:

```ts
import { resolve } from "node:path";
import {
  setWasmBasePath,
  ensureLoaded,
} from "quantum-forge/quantum";

setWasmBasePath(resolve(process.cwd(), "node_modules/quantum-forge/dist"));
await ensureLoaded();
```

For the Qubit edition in Node, `useQuantumForgeBuild("qubit")` first, then override its browser route with the edition's absolute directory:

```ts
useQuantumForgeBuild("qubit");
setWasmBasePath(resolve(
  process.cwd(),
  "node_modules/quantum-forge/dist/quantum-forge-qubit",
));
await ensureLoaded();
```

Calling `setWasmBasePath(...)` before `useQuantumForgeBuild("qubit")` does not work headlessly because `useQuantumForgeBuild` replaces it with the browser path `/quantum-forge-qubit`.

In Vitest, configure the chosen edition in `beforeAll`; loading is cached. Test invariants rather than expecting a random single outcome—for example, an iSwap split must produce only `[1,0]` or `[0,1]`. Use forced outcomes only for replay-specific tests.

## Framework architecture

For TypeScript games, keep four layers:

1. Pure game rules with no rendering/input/WASM side effects.
2. `Engine<TState>` as state coordinator. `getState()` is read-only; create a new state for `setState()`.
3. Renderer derived from state (`PixiRenderer` or `CanvasRenderer`). Await `PixiRenderer.init()`.
4. Controller wiring Engine, renderer, input, and `GameLoop`.

Engine subclasses implement both abstract methods: `getHelpers()` and `reset()`.

Common exports:

```ts
import { Engine } from "quantum-forge-engine/engine";
import { PixiRenderer, CanvasRenderer, GameLoop, Camera } from "quantum-forge-engine/rendering";
import { InputManager, LocalMultiplayerManager, GamepadButtons } from "quantum-forge-engine/input";
import { EventBus } from "quantum-forge-engine/events";
```

Optional systems cover collision, audio, particles, animation, entities, state machines, timers, saves, scenes, and operations. Add them with `npx quantum-forge-engine add-system` on engine 1.3.0+.

## Release and licensing

The current upstream summary says the TypeScript framework and Unity C# source are MIT licensed, while WASM binaries and native plugins are proprietary and free for applications under $100K annual revenue with visible attribution. Treat that as a routing note, not legal advice: verify the license shipped with the exact package/version before release. Use `getAttribution()` rather than hard-coding attribution text.

## Design checklist for a quantum game mechanic

Before coding, answer:

1. What does each basis value mean in game terms?
2. Which action creates superposition or entanglement?
3. How can the player influence phase or amplitudes without directly choosing an outcome?
4. What gameplay event causes measurement?
5. How are probability, coherence, phase, and correlations communicated visually?
6. What is the maximum connected entanglement group?
7. When is each property measured/released or destroyed?
8. What classical fallback keeps play working when the quantum budget is exhausted?
9. Which circuit invariants can be tested headlessly?
10. Does save/replay require operation recording from the start of the level?

## Frequent mistakes

- Using camelCase WASM calls such as `iSwap` or `measureProperties`.
- Calling `probabilities(prop)` instead of `probabilities([prop])`.
- Omitting the required iSwap fraction.
- Treating omitted fraction and `1.0` as equivalent.
- Creating an anti-correlated split from the wrong initial state.
- Using a target as its own predicate/control.
- Jointly querying independent properties and accidentally tensoring them.
- Dropping handles without pooling or destroying their underlying properties.
- Using a property after destroy.
- Mutating `engine.getState()`.
- Assuming public builds support dimensions above 3.
- Forgetting visible attribution. Obtain its current text with `getAttribution()`.

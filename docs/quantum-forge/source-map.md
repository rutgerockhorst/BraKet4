# Quantum Forge source map

This file routes a task to the smallest useful slice of upstream documentation. Read the local [quick reference](quick-reference.md) first, then open only the rows whose **Read when** condition matches the work.

## Source hierarchy and snapshot

| Source | Use |
|---|---|
| [`installed-package-audit.md`](installed-package-audit.md) | Installed versions, runtime checks, and known bundled-documentation corrections |
| Installed `.d.ts` files and runtime | Final authority for exact signatures and behavior available in this project |
| `node_modules/quantum-forge/QUANTUM_FORGE.md` | Package-version-matched narrative reference, subject to the package-audit corrections |
| <https://docs.quantum.dev/llms.txt> | Official compact, whole-toolkit agent digest; use for broad refreshes, not every task |
| Relevant page below | Focused concepts, examples, caveats, and rationale |
| <https://github.com/quantum-native/quantum-forge> | Framework source, releases, and issues |
| <https://github.com/quantum-native/quantum-forge-unity> | Unity package source and releases |

Local digest provenance:

- Upstream agent digest checked from `https://docs.quantum.dev/llms.txt`.
- Response date: `2026-09-16`.
- Response ETag: `W/"e8c633bf79b4d3b582fbc05d83a5109a"`.
- Installed and lockfile-resolved: `quantum-forge@2.7.0` and `quantum-forge-engine@1.4.0`.
- Runtime-checked locally: qutrit limits `d≤3`, 12 qudits; qubit limits `d=2`, 20 qudits; state-size limit 100,000; anti-correlated iSwap circuit.

Do not assume the live docs match the installed packages. Resolve discrepancies in favor of installed runtime/declarations, while checking [`installed-package-audit.md`](installed-package-audit.md) for known declaration and documentation defects.

## Getting started

| Page | Read when |
|---|---|
| [Quick Start](https://docs.quantum.dev/getting-started/) | Scaffolding or adding TypeScript packages manually |
| [First Quantum Game](https://docs.quantum.dev/getting-started/first-quantum-game) | Building the first vertical slice or checking the intended Engine/registry wiring |
| [Project Structure](https://docs.quantum.dev/getting-started/project-structure) | Deciding module boundaries or placing new files |
| [AI Agents](https://docs.quantum.dev/getting-started/ai-agents) | Configuring agents, non-interactive scaffolding, or headless quantum checks |

## Quantum mechanics and simulation

| Page | Read when |
|---|---|
| [Why Quantum?](https://docs.quantum.dev/quantum/) | Designing a mechanic and deciding whether it genuinely needs quantum behavior |
| [Core Concepts](https://docs.quantum.dev/quantum/core-concepts) | Mapping game objects to properties or reviewing the complete acquire→gate→measure loop |
| [Setup](https://docs.quantum.dev/quantum/setup) | WASM loading, editions, Vite, offline support, runtime limits, or attribution |
| [Gates](https://docs.quantum.dev/quantum/gates) | Writing any circuit; verify signatures, fraction semantics, predicates, and batch formats |
| [Measurement](https://docs.quantum.dev/quantum/measurement) | Collapse, probabilities, density matrices, predicate projection, or forced outcomes |
| [Entanglement](https://docs.quantum.dev/quantum/entanglement) | Correlated/anti-correlated mechanics, controlled gates, tensor growth, or split patterns |
| [Phase & Interference](https://docs.quantum.dev/quantum/phase) | Player-influenced odds, phase visualization, coherence, or Grover-style mechanics |
| [Recording & Replay](https://docs.quantum.dev/quantum/recording) | Save/load, undo, deterministic replay, or serializing quantum behavior |
| [Lifecycle & State Management](https://docs.quantum.dev/quantum/lifecycle) | Destroying properties, state budgets, isolated simulations, search trees, or undo cleanup |
| [Error Handling](https://docs.quantum.dev/quantum/error-handling) | Fallback behavior, state-size failures, OOM handling, invalid operations, or collapse warnings |
| [Performance](https://docs.quantum.dev/quantum/performance) | Frame-time work, pooling, batching, object limits, monitoring, or optimization |
| [Quantum API](https://docs.quantum.dev/api/quantum) | Exact public TypeScript API and types after checking installed declarations |

Quantum routing shortcuts:

- **New mechanic:** Why Quantum? → Core Concepts → relevant Entanglement or Phase page.
- **Implement circuit:** Gates + Measurement; add Entanglement if there are controls/two-property gates.
- **Save/replay:** Recording + Lifecycle.
- **Slow/crashing build:** Performance + Lifecycle + Error Handling.
- **AI/search simulation:** Lifecycle (`QuantumSimulation`) + Gates batching.

## TypeScript game framework

| Page | Read when |
|---|---|
| [Framework Overview](https://docs.quantum.dev/framework/) | Reviewing overall architecture |
| [Engine](https://docs.quantum.dev/framework/engine) | State, helpers, reset, controllers, or update flow |
| [Rendering](https://docs.quantum.dev/framework/rendering) | PixiJS, Canvas, game loop, camera, or coordinate transforms |
| [Input](https://docs.quantum.dev/framework/input) | Keyboard, mouse, gamepad, touch, actions, or local multiplayer |
| [Events](https://docs.quantum.dev/framework/events) | Decoupled event communication and lifecycle |
| [Packages](https://docs.quantum.dev/framework/packages) | Optional systems: collision, audio, particles, entities, animation, scenes, etc. |
| [Operations](https://docs.quantum.dev/framework/operations) | Command/operation patterns or undoable game actions |
| [API Overview](https://docs.quantum.dev/api/) | Locating framework API references |
| [Engine API](https://docs.quantum.dev/api/engine) | Exact Engine contracts |
| [Rendering API](https://docs.quantum.dev/api/rendering) | Exact renderer, loop, and camera contracts |
| [Input API](https://docs.quantum.dev/api/input) | Exact input types and methods |
| [Packages API](https://docs.quantum.dev/api/packages) | Exact optional-system exports |
| [CLI](https://docs.quantum.dev/cli/) | `init`, `add-system`, `validate`, `doctor`, flags, and version constraints |

## Unity

| Page | Read when |
|---|---|
| [Unity: Get Started](https://docs.quantum.dev/unity/) | Installation and first inspector-driven mechanic |
| [Unity: Advanced Topics](https://docs.quantum.dev/unity/advanced) | Nontrivial state, lifecycle, integration, or performance |
| [Unity: API Reference](https://docs.quantum.dev/unity/api) | Exact C# components and methods |
| [Unity: Samples](https://docs.quantum.dev/unity/samples) | Looking for an implementation pattern before writing one |

## Game-design examples

Use showcases for mechanic inspiration, not as API authority.

| Page | Mechanic to study |
|---|---|
| [Showcase overview](https://docs.quantum.dev/showcase/) | Compare established mechanic families |
| [Quantum Pong](https://docs.quantum.dev/showcase/quantum-pong) | Anti-correlated ball splitting and phase-biased scoring |
| [Quantris](https://docs.quantum.dev/showcase/quantris) | Quantum existence in puzzle pieces |
| [Hex Diffusion](https://docs.quantum.dev/showcase/hex-diffusion) | Fractional diffusion and phase-marked barriers; requires a custom dimension-7 build and is not reproducible with public editions |
| [Bloch Invaders](https://docs.quantum.dev/showcase/bloch-invaders) | Y/Z control and Bloch-sphere visualization |
| [Ponq](https://docs.quantum.dev/showcase/ponq) | Density-matrix coherence driving physics |

## Refresh procedure

When Quantum Forge is installed or upgraded:

1. Record exact `quantum-forge`, `quantum-forge-engine`, or Unity package versions above and in `installed-package-audit.md`.
2. Read the installed declarations, `QUANTUM_FORGE.md`, and package audit. Compare high-risk details against the quick reference: edition limits, initialization, gate signatures, fraction semantics, lifecycle, recorder behavior, and error prefixes.
3. Fetch `https://docs.quantum.dev/llms.txt`. If its ETag changed, scan it for changed APIs and newly documented caveats.
4. Open only affected deep pages from this map.
5. Update `quick-reference.md`, this provenance block, and tests that encode changed behavior.
6. Verify at least one circuit headlessly against the installed runtime.

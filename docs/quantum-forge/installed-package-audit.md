# Installed Quantum Forge package audit

This is the compatibility layer between the local digest and the exact npm releases installed in this repository. Read it after the [quick reference](quick-reference.md) and before copying bundled examples.

## Installed baseline

Resolved by `package-lock.json`:

| Package | Version | Role |
|---|---:|---|
| `quantum-forge` | 2.7.0 | WASM loader, simulator API, property manager, recorder, Vite plugin |
| `quantum-forge-engine` | 1.4.0 | Engine, rendering, input, events, operations, and optional systems |
| `eventemitter3` | 5.0.4 | Engine dependency |

Both Quantum Forge packages require Node 18 or newer. The engine declares `pixi.js` and `howler` as optional peers; neither is installed yet. This is a bare dependency install, not a scaffolded game: there is no Vite/TypeScript/test setup or application source yet.

Package-specific references:

- Core narrative: `node_modules/quantum-forge/QUANTUM_FORGE.md`
- Core declarations: `node_modules/quantum-forge/dist/lib/quantum.d.ts`
- Engine declarations: `node_modules/quantum-forge-engine/dist/lib/*.d.ts`
- Engine architecture context: `node_modules/quantum-forge-engine/context/`
- Binary terms: `node_modules/quantum-forge/dist/LICENSE-BINARY.md`

## Runtime verification

The installed binaries were exercised directly under Node using an absolute WASM path.

Verified for the default Qutrit edition:

- `getMaxDimension()` → `3`
- `getMaxQudits()` → `12`
- `getMaxStateSize()` → `100000`
- Twenty `|10⟩ → i_swap(0.5) → measure` trials produced only `[0,1]` and `[1,0]`, and both outcomes were observed.
- Pooling the measured properties allowed the same handles to be reused across trials.

Verified for the Qubit edition:

- `getMaxDimension()` → `2`
- `getMaxQudits()` → `20`
- Headless setup must call `useQuantumForgeBuild("qubit")` and then set the absolute base path to `node_modules/quantum-forge/dist/quantum-forge-qubit`. Reversing those calls lets the build selector overwrite the filesystem path with `/quantum-forge-qubit` and Node fails to resolve the module.

Known runtime defect in core 2.7.0:

- The default binary's `getVersion()` returns `".."`. Use `package-lock.json` or `node_modules/quantum-forge/package.json` for version reporting.

## Corrections to bundled documentation

The installed declarations/runtime outrank these bundled examples.

### Core `README.md` uses a removed or unpublished facade

Its quick start calls methods directly on `QuantumPropertyManager`:

```ts
qpm.hadamard(qubit);
qpm.probabilities(qubit);
qpm.measureProperties([qubit]);
qpm.iSwap(a, b);
```

None of those manager methods exists in the 2.7.0 declaration. Use the WASM module and snake_case names:

```ts
const m = qpm.getModule();
m.hadamard(qubit);
m.probabilities([qubit]);
m.measure_properties([qubit]);
m.i_swap(a, b, 0.5);
```

The engine 1.4.0 `README.md` repeats the same stale direct-manager style (`this.cycle`, `this.iSwap`, `this.measureProperties`). Do not copy it.

### `QUANTUM_FORGE.md` has fractional-gate mistakes

The reference correctly warns that an omitted fraction is not equivalent to `1`, but two later examples contradict it:

```ts
m.shift(prop2, 1, [prop1.is(1)]);
m.hadamard(target, 1, [control.is(1)]);
```

Those select fractional gates. For the discrete CNOT and discrete conditional-H patterns described by the text, use:

```ts
m.shift(prop2, undefined, [prop1.is(1)]);
m.hadamard(target, undefined, [control.is(1)]);
```

Its gate table also renders `clock` as though `fraction` were required. The 2.7.0 declaration is `clock(prop, fraction?, predicates?)`; omitted and supplied fractions still select different operations.

### Recorder attachment is required

The bundled recorder section constructs a `QuantumRecorder` but omits attachment. To receive automatic acquire/release/assign/unassign lifecycle hooks:

```ts
const recorder = new QuantumRecorder(qpm);
qpm.setRecorder(recorder);
recorder.startRecording();
```

Gate calls still require explicit `recordOp(...)` entries.

### Batch tape is module-only

A comment in `quantum.d.ts` shows a top-level `executeBatchTape` import, but the package's public export list does not export that function directly. Reach both batch functions through the loaded module:

```ts
const m = qpm.getModule();
m.executeBatch(ops);
m.executeBatchTape(properties, tape);
```

`OP` is available as a top-level import.

### Engine context uses obsolete scoped package names

Files under `node_modules/quantum-forge-engine/context/` and its bundled Quantum Pong example use imports such as:

```ts
@quantum-native/quantum-forge/quantum
@quantum-native/quantum-forge-engine/engine
```

The installed npm packages export the unscoped names:

```ts
quantum-forge/quantum
quantum-forge-engine/engine
```

Translate context examples before use.

### Engine declarations reference a missing scoped logging package

Several engine 1.4.0 declaration files import `LoggerInterface` from `@quantum-native/quantum-forge/logging`, while the package depends on and installs only unscoped `quantum-forge`. Runtime JavaScript erases these type-only imports, but strict declaration checking may report module-resolution errors. Treat this as an upstream packaging defect; do not rewrite `node_modules`. Verify the chosen TypeScript configuration when the project is scaffolded and revisit this note on upgrade.

## Licensing confirmed from installed files

- Quantum Forge TypeScript and engine source: MIT.
- Compiled WASM/native binaries: proprietary.
- Free binary use requires visible “Powered by Quantum Forge” attribution and applies while an application remains at or below $100,000 USD annual gross revenue.
- Above that threshold—or to remove attribution—contact `hello@quantum.dev` for a commercial license.

Use `getAttribution()` for display text, and re-read the installed license before release.

## Upgrade checklist

On either package upgrade:

1. Update the version table.
2. Re-run the qutrit and qubit headless smoke circuits.
3. Re-check every discrepancy above; remove resolved warnings.
4. Compare gate, recorder, lifecycle, batch, and Engine declarations.
5. Update the quick reference and source-map provenance.

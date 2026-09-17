# Agent instructions

## Quantum Forge work

For any task that designs, implements, tests, or reviews Quantum Forge code:

1. Read [`docs/quantum-forge/quick-reference.md`](docs/quantum-forge/quick-reference.md) first. It is the small, default context.
2. Read [`docs/quantum-forge/installed-package-audit.md`](docs/quantum-forge/installed-package-audit.md) for the installed versions and known documentation/package discrepancies.
3. Use [`docs/quantum-forge/source-map.md`](docs/quantum-forge/source-map.md) to choose only the deeper page(s) relevant to the task. Do not read the entire upstream docset by default.
4. Prefer the installed package's TypeScript declarations and runtime for version-specific truth. Use `node_modules/quantum-forge/QUANTUM_FORGE.md` for narrative context, subject to the corrections in the package audit.
5. If exact signatures or behavior matter, verify them rather than guessing. Priority: installed runtime and declarations, the local package audit, relevant live documentation page, installed `QUANTUM_FORGE.md`, then the local quick reference. Do not copy API examples from either installed package README without checking declarations; both contain stale direct-manager examples in the installed releases.
6. Keep game rules as pure functions where practical. Keep quantum state in a dedicated registry/adapter, and make measurement moments explicit in game logic.
7. Test quantum circuits headlessly. In Node/Vitest, set an absolute WASM base path before `ensureLoaded()` as shown in the quick reference.
8. Preserve the required visible Quantum Forge attribution and check the current license before release.

When the toolkit version changes, compare the upstream agent digest at <https://docs.quantum.dev/llms.txt>, update the local quick reference and package audit, and record the new package versions and upstream ETag in `docs/quantum-forge/source-map.md`.

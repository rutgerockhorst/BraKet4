import { resolve } from "node:path";
import { beforeAll } from "vitest";
import { ensureLoaded, setWasmBasePath, useQuantumForgeBuild } from "quantum-forge/quantum";

beforeAll(async () => {
  useQuantumForgeBuild("qubit");
  setWasmBasePath(resolve(process.cwd(), "node_modules/quantum-forge/dist/quantum-forge-qubit"));
  await ensureLoaded();
});

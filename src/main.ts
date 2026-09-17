import "./styles.css";
import {
  ensureLoaded,
  getAttribution,
  setWasmBasePath,
  useQuantumForgeBuild,
} from "quantum-forge/quantum";
import { GameLoop } from "quantum-forge-engine/rendering";
import type { PlayerId } from "./engine/types";
import { BracketGameEngine } from "./game/BracketGameEngine";
import { GameController } from "./game/GameController";
import { ForgeQuantumRuntime } from "./quantum/ForgeQuantumRuntime";
import type { QuantumRuntime } from "./quantum/QuantumRuntime";
import { SymbolicQuantumRuntime } from "./quantum/SymbolicQuantumRuntime";
import { GameRenderer } from "./rendering/GameRenderer";
import { HudView } from "./ui/HudView";

(window as Window & { __braketBooted?: boolean }).__braketBooted = true;

function initialStarter(): PlayerId {
  const byte = new Uint8Array(1);
  crypto.getRandomValues(byte);
  return (((byte[0] ?? 0) & 1) as PlayerId);
}

async function withTimeout<T>(promise: Promise<T>, milliseconds: number): Promise<T> {
  let timer = 0;
  const timeout = new Promise<never>((_, reject) => {
    timer = window.setTimeout(
      () => reject(new Error(`Quantum Forge did not initialize within ${milliseconds / 1000} seconds`)),
      milliseconds,
    );
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    window.clearTimeout(timer);
  }
}

async function main(): Promise<void> {
  const loading = document.getElementById("loading");
  const canvas = document.getElementById("game-canvas");
  const attribution = document.getElementById("attribution");
  if (!(canvas instanceof HTMLCanvasElement) || !loading || !attribution) {
    throw new Error("The game shell is incomplete");
  }

  try {
    loading.textContent = "Loading the Quantum Forge qubit runtime…";
    useQuantumForgeBuild("qubit");
    setWasmBasePath(new URL("quantum-forge-qubit", document.baseURI).href.replace(/\/$/, ""));

    let quantum: QuantumRuntime;
    try {
      await withTimeout(ensureLoaded(), 6_000);
      quantum = new ForgeQuantumRuntime();
      attribution.textContent = getAttribution();
    } catch (error) {
      console.warn("Quantum Forge unavailable; using the exact symbolic fallback", error);
      quantum = new SymbolicQuantumRuntime();
      attribution.textContent = "Powered by Quantum Forge · symbolic fallback active";
    }

    loading.textContent = "Drawing the bracket board…";
    const engine = new BracketGameEngine(initialStarter());
    const renderer = new GameRenderer(canvas);

    let controller: GameController;
    const hud = new HudView({
      column: (col) => controller.selectColumn(col),
      operator: (key) => controller.chooseOperator(key),
      undo: () => controller.undo(),
      redo: () => controller.redo(),
      restart: () => controller.restart(),
    });
    controller = new GameController(engine, quantum, renderer);
    controller.attachHud(hud);

    loading.hidden = true;
    canvas.hidden = false;

    const loop = new GameLoop({
      update: () => controller.update(),
      render: () => renderer.render(engine.getState()),
      targetFps: 60,
    });
    loop.start();

    window.addEventListener("beforeunload", () => {
      loop.stop();
      controller.destroy();
    });
  } catch (error) {
    loading.textContent = `Quantum Forge failed to start: ${error instanceof Error ? error.message : String(error)}`;
    loading.classList.add("error");
    throw error;
  }
}

void main();

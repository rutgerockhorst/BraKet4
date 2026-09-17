import type { BasisState, Half, MovePlan } from "../engine/types";

export interface QuantumResolution {
  measured: BasisState;
  stochastic: boolean;
}

export interface QuantumRuntime {
  prepareKet(half: Half): void;
  resolveSandwich(plan: Extract<MovePlan, { stage: "bra" }>, forced?: BasisState): QuantumResolution;
  resetRegistry(): void;
  hasKet(id: number): boolean;
  probabilityOfOne(id: number): number;
  readonly activeCount: number;
}

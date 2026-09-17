import { applyDeterministicOperator } from "../engine/operators";
import type { BasisState, Half, MovePlan } from "../engine/types";
import type { QuantumResolution, QuantumRuntime } from "./QuantumRuntime";

export type RandomSource = () => number;

export class SymbolicQuantumRuntime implements QuantumRuntime {
  private readonly kets = new Map<number, BasisState>();

  constructor(private readonly random: RandomSource = Math.random) {}

  get activeCount(): number {
    return this.kets.size;
  }

  prepareKet(half: Half): void {
    if (this.kets.has(half.id)) throw new Error(`Quantum ket ${half.id} already exists`);
    this.kets.set(half.id, half.state);
  }

  resolveSandwich(
    plan: Extract<MovePlan, { stage: "bra" }>,
    forced?: BasisState,
  ): QuantumResolution {
    const ket = this.kets.get(plan.ket.id);
    if (ket === undefined) throw new Error(`Missing quantum ket ${plan.ket.id}`);
    let measured: BasisState;
    if (plan.operator.key === "H") {
      measured = forced ?? (this.random() < 0.5 ? 0 : 1);
    } else {
      measured = applyDeterministicOperator(ket, plan.operator.key);
      if (forced !== undefined && forced !== measured) {
        throw new Error(`Impossible forced outcome ${forced}`);
      }
    }
    this.kets.delete(plan.ket.id);
    return { measured, stochastic: plan.operator.key === "H" };
  }

  resetRegistry(): void {
    this.kets.clear();
  }

  hasKet(id: number): boolean {
    return this.kets.has(id);
  }

  probabilityOfOne(id: number): number {
    const state = this.kets.get(id);
    if (state === undefined) throw new Error(`Missing quantum ket ${id}`);
    return state;
  }
}

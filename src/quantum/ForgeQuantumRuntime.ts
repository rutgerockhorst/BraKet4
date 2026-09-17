import { QuantumPropertyManager } from "quantum-forge/quantum";
import { applyDeterministicOperator } from "../engine/operators";
import type { BasisState, Half, MovePlan } from "../engine/types";
import type { QuantumResolution, QuantumRuntime } from "./QuantumRuntime";

function propertyId(id: number): string {
  return `ket:${id}`;
}

export class ForgeQuantumRuntime extends QuantumPropertyManager implements QuantumRuntime {
  constructor() {
    super({ dimension: 2 });
  }

  get activeCount(): number {
    return this.size;
  }

  prepareKet(half: Half): void {
    const id = propertyId(half.id);
    if (this.hasProperty(id)) throw new Error(`Quantum ket ${half.id} already exists`);
    const property = this.acquireProperty();
    let current: BasisState = 0;
    try {
      if (half.state === 1) {
        this.getModule().x(property);
        current = 1;
      }
      this.setProperty(id, property);
    } catch (error) {
      this.releaseProperty(property, current);
      throw error;
    }
  }

  resolveSandwich(
    plan: Extract<MovePlan, { stage: "bra" }>,
    forced?: BasisState,
  ): QuantumResolution {
    const id = propertyId(plan.ket.id);
    const property = this.getProperty(id);
    if (!property) throw new Error(`Missing quantum ket ${plan.ket.id}`);
    const module = this.getModule();

    if (plan.operator.key === "X") module.x(property);
    if (plan.operator.key === "H") module.hadamard(property);

    const [measuredRaw] =
      forced === undefined
        ? module.measure_properties([property])
        : module.forced_measure_properties([property], [forced]);
    if (measuredRaw !== 0 && measuredRaw !== 1) {
      throw new Error(`Quantum Forge returned invalid qubit value ${String(measuredRaw)}`);
    }
    const measured = measuredRaw as BasisState;

    if (forced !== undefined && measured !== forced) {
      throw new Error(`Recorded outcome ${forced} is impossible in this position`);
    }
    if (plan.operator.key !== "H") {
      const expected = applyDeterministicOperator(plan.ket.state, plan.operator.key);
      if (measured !== expected) {
        throw new Error(`Deterministic ${plan.operator.key} circuit drifted from ${expected}`);
      }
    }

    this.deleteProperty(id);
    this.releaseProperty(property, measured);
    return { measured, stochastic: plan.operator.key === "H" };
  }

  resetRegistry(): void {
    for (const id of [...this._getProperties().keys()]) this.removeProperty(id);
  }

  hasKet(id: number): boolean {
    return this.hasProperty(propertyId(id));
  }

  probabilityOfOne(id: number): number {
    const property = this.getProperty(propertyId(id));
    if (!property) throw new Error(`Missing quantum ket ${id}`);
    const outcomes = this.getModule().probabilities([property]);
    return outcomes.find((outcome) => outcome.qudit_values[0] === 1)?.probability ?? 0;
  }
}

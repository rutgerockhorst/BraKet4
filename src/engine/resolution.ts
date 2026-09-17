import { outcomeProbabilities } from "./operators";
import type { BasisState, MovePlan } from "./types";

export interface ResolutionBranch {
  probability: number;
  measurements: BasisState[];
}

export function resolutionBranches(plan: MovePlan): readonly ResolutionBranch[] {
  if (plan.stage !== "bra") return [{ probability: 1, measurements: [] }];
  return outcomeProbabilities(plan.ket.state, plan.half.state, plan.operator.key).map(
    ({ measured, probability }) => ({
      probability,
      measurements: plan.operator.key === "H" ? [measured] : [],
    }),
  );
}

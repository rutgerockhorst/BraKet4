import type { BasisState, OperatorKey } from "./types";

export function applyDeterministicOperator(
  state: BasisState,
  operator: Exclude<OperatorKey, "H">,
): BasisState {
  return operator === "X" ? (state === 0 ? 1 : 0) : state;
}

export function isStochasticOperator(operator: OperatorKey): boolean {
  return operator === "H";
}

export function outcomeProbabilities(
  ket: BasisState,
  bra: BasisState,
  operator: OperatorKey,
): readonly { measured: BasisState; value: BasisState; probability: number }[] {
  if (operator === "H") {
    return [
      { measured: 0, value: bra === 0 ? 1 : 0, probability: 0.5 },
      { measured: 1, value: bra === 1 ? 1 : 0, probability: 0.5 },
    ];
  }
  const measured = applyDeterministicOperator(ket, operator);
  return [{ measured, value: measured === bra ? 1 : 0, probability: 1 }];
}

export function operatorSummary(key: OperatorKey): string {
  if (key === "I") return "I preserves the ket";
  if (key === "X") return "X flips the ket";
  return "H creates a 50/50 measurement";
}

import { commitMove, planMove } from "../engine/moves";
import { resolutionBranches } from "../engine/resolution";
import { newGameState } from "../engine/state";
import type { PlayerId, Winner } from "../engine/types";
import { chooseMove } from "./search";

export interface SelfPlayConfig {
  gamesPerStarter: number;
  depth: number;
  quiescence: number;
  seed: number;
  exploration?: number;
}

export interface StarterResult {
  starter: PlayerId;
  blue: number;
  red: number;
  draws: number;
  averagePlies: number;
}

export interface BalanceReport {
  config: SelfPlayConfig;
  starters: [StarterResult, StarterResult];
  blueRate: number;
  redRate: number;
  drawRate: number;
  firstPlayerRate: number;
}

export function seededRandom(seed: number): () => number {
  let value = seed >>> 0;
  return () => {
    value += 0x6d2b79f5;
    let t = value;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };
}

function sample<T extends { probability: number }>(items: readonly T[], random: () => number): T {
  const target = random();
  let sum = 0;
  for (const item of items) {
    sum += item.probability;
    if (target <= sum + Number.EPSILON) return item;
  }
  return items[items.length - 1]!;
}

export function playGame(
  starter: PlayerId,
  config: Omit<SelfPlayConfig, "gamesPerStarter">,
): { winner: Winner; plies: number } {
  const random = seededRandom(config.seed);
  let state = newGameState(starter);
  while (state.winner === null && state.moveNo < 160) {
    const move = chooseMove(state, {
      depth: config.depth,
      quiescence: config.quiescence,
      random,
      exploration: config.exploration,
    });
    const plan = planMove(state, move);
    if (!plan.ok) throw new Error(plan.error);
    const branch = sample(resolutionBranches(plan.value), random);
    const committed = commitMove(state, plan.value, branch.measurements);
    if (!committed.ok) throw new Error(committed.error);
    state = committed.value.state;
  }
  return { winner: state.winner ?? "draw", plies: state.moveNo };
}

export function runBalance(config: SelfPlayConfig): BalanceReport {
  const starterResults = ([0, 1] as const).map((starter) => {
    let blue = 0;
    let red = 0;
    let draws = 0;
    let plies = 0;
    for (let game = 0; game < config.gamesPerStarter; game += 1) {
      const result = playGame(starter, { ...config, seed: config.seed + starter * 1_000_003 + game });
      if (result.winner === 0) blue += 1;
      else if (result.winner === 1) red += 1;
      else draws += 1;
      plies += result.plies;
    }
    return { starter, blue, red, draws, averagePlies: plies / config.gamesPerStarter };
  }) as [StarterResult, StarterResult];

  const total = config.gamesPerStarter * 2;
  const blue = starterResults[0].blue + starterResults[1].blue;
  const red = starterResults[0].red + starterResults[1].red;
  const draws = starterResults[0].draws + starterResults[1].draws;
  const first = starterResults[0].blue + starterResults[1].red;
  return {
    config,
    starters: starterResults,
    blueRate: blue / total,
    redRate: red / total,
    drawRate: draws / total,
    firstPlayerRate: first / total,
  };
}

export function wilsonInterval(wins: number, total: number, z = 1.96): [number, number] {
  if (total === 0) return [0, 0];
  const p = wins / total;
  const denominator = 1 + (z * z) / total;
  const center = (p + (z * z) / (2 * total)) / denominator;
  const margin =
    (z * Math.sqrt((p * (1 - p)) / total + (z * z) / (4 * total * total))) /
    denominator;
  return [center - margin, center + margin];
}

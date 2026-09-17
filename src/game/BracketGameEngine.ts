import { Engine } from "quantum-forge-engine/engine";
import { newGameState } from "../engine/state";
import type { GameState, PlayerId } from "../engine/types";

export interface BracketGameHelpers {
  replaceState: (state: GameState) => void;
  resetWithStarter: (starter: PlayerId) => void;
}

export class BracketGameEngine extends Engine<GameState> {
  private starter: PlayerId;

  constructor(starter: PlayerId) {
    super(newGameState(starter));
    this.starter = starter;
  }

  getHelpers(): BracketGameHelpers {
    return {
      replaceState: (state) => this.setState(state),
      resetWithStarter: (starter) => {
        this.starter = starter;
        this.setState(newGameState(starter));
      },
    };
  }

  reset(): void {
    this.setState(newGameState(this.starter));
  }
}

import type { GameEvent } from "./types";

export function eventAnnouncement(event: GameEvent): string {
  switch (event.type) {
    case "ket-dropped":
      return `Ket ${event.half.state} dropped in column ${event.coord.c + 1}.`;
    case "operator-dropped":
      return `Operator ${event.operator.key} added in column ${event.coord.c + 1}.`;
    case "sandwich-resolved":
      return `Column ${event.coord.c + 1} measured ${event.value}.`;
    case "game-ended":
      return event.winner === "draw"
        ? "The game is a draw."
        : `${event.winner === 0 ? "Blue" : "Red"} wins.`;
  }
}

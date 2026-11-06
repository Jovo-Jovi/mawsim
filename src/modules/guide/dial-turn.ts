import { dialTurnDegrees } from "@/modules/produce";
import { calendarMonths, type CalendarMonth } from "../../domain";

const monthStep = Math.abs(dialTurnDegrees(2, "ltr") - dialTurnDegrees(1, "ltr"));
const fullTurn = monthStep * calendarMonths.length;
const halfTurn = fullTurn / 2;

/**
 * Short-way offset from the previous selected month to the next, in degrees.
 * Previous turn minus the new turn, folded into (−half turn, half turn].
 * The sign follows `dialTurnDegrees`, so it mirrors in `rtl`.
 */
export function dialTurnOffset(
  previous: CalendarMonth,
  next: CalendarMonth,
  direction: "ltr" | "rtl",
): number {
  const delta = dialTurnDegrees(previous, direction) - dialTurnDegrees(next, direction);
  const wrapped = ((delta % fullTurn) + fullTurn) % fullTurn;
  if (wrapped > halfTurn) return wrapped - fullTurn;
  return wrapped;
}

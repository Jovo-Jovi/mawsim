import { calendarMonths, type CalendarMonth } from "../../domain";

/**
 * Short-way offset from the previous selected month to the next, in degrees.
 * Previous turn minus the new turn, folded into (−half turn, half turn].
 * `turnOf` is `dialTurnDegrees`, the one source of angles, so the sign mirrors in `rtl`.
 * The client passes the values that function already returned: importing it here would
 * pull the produce barrel, and its cached month helper, into the client bundle.
 */
export function dialTurnOffset(
  previous: CalendarMonth,
  next: CalendarMonth,
  direction: "ltr" | "rtl",
  turnOf: (month: CalendarMonth, direction: "ltr" | "rtl") => number,
): number {
  const monthStep = Math.abs(turnOf(2, direction) - turnOf(1, direction));
  const fullTurn = monthStep * calendarMonths.length;
  const halfTurn = fullTurn / 2;
  const delta = turnOf(previous, direction) - turnOf(next, direction);
  const wrapped = ((delta % fullTurn) + fullTurn) % fullTurn;
  if (wrapped > halfTurn) return wrapped - fullTurn;
  return wrapped;
}

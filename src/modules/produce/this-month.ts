import { cacheLife } from "next/cache";
import { cairoMonth, type CalendarMonth } from "../../domain";

export async function thisCalendarMonth(): Promise<CalendarMonth> {
  "use cache";
  cacheLife("hours");
  return cairoMonth(new Date());
}

import { GRADE } from "../workers/rxdb/Schema";
import { GradesType } from "../lib/types";

export function getColour(grade: GradesType, palette: Record<string, any>) {
  if (!grade) return palette.primary.light;
  switch (grade.id) {
    case GRADE.UNKNOWN.toString():
      return palette.warning.light;
    case GRADE.HARD.toString():
      return palette.info.light;
    case GRADE.GOOD.toString():
      return palette.success.light;
    case GRADE.KNOWN.toString():
      return palette.error.light;
  }
  return palette.primary.light;
}

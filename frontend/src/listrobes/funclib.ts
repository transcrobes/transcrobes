import { GRADE } from "../database/Schema";
import { GradesType } from "../lib/types";

export function getColour(grade: GradesType, palette: Record<string, any>) {
  if (!grade) return palette.primary.light;
  switch (grade.id) {
    case GRADE.UNKNOWN.toString():
      return palette.error.light;
    case GRADE.HARD.toString():
      return palette.warning.light;
    case GRADE.GOOD.toString():
      return palette.success.light;
    case GRADE.KNOWN.toString():
      return palette.info.light;
  }
  return palette.primary.light;
}

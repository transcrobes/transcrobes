import { ThemeName } from "../lib/types";

export const CHANGE_THEME = "CHANGE_THEME";

export function changeTheme(theme: ThemeName): { type: string; payload: ThemeName } {
  return {
    type: CHANGE_THEME,
    payload: theme,
  };
}

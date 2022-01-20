import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { ThemeName } from "../../lib/types";

const initialState = ((typeof localStorage !== "undefined" && localStorage.getItem("mode")) || "light") as ThemeName;

const themeSlice = createSlice({
  name: "theme",
  initialState,
  reducers: {
    changeTheme(state, action: PayloadAction<ThemeName>) {
      state = action.payload;
    },
  },
});

export const { changeTheme } = themeSlice.actions;
export default themeSlice.reducer;

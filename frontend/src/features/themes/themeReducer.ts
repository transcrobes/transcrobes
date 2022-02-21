import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { ThemeName } from "../../lib/types";

let initialState = "light" as ThemeName;
try {
  initialState = ((typeof localStorage !== "undefined" && localStorage.getItem("mode")) || "light") as ThemeName;
} catch (err) {
  console.log("Looks like we can't access localStorage after all");
}
const themeSlice = createSlice({
  name: "theme",
  initialState,
  reducers: {
    changeTheme(state, action: PayloadAction<ThemeName>) {
      return action.payload;
    },
  },
});

export const { changeTheme } = themeSlice.actions;
export default themeSlice.reducer;

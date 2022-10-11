import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { BASE_DICT_PROVIDERS } from "../../lib/types";

type DictionaryState = Record<string, string>;
const initialState = BASE_DICT_PROVIDERS as DictionaryState;
const dictionarySlice = createSlice({
  name: "dictionary",
  initialState,
  reducers: {
    addDictionaryProviders(state, action: PayloadAction<Record<string, string>>) {
      // TODO: can this just be done via destructuring?
      for (const [id, name] of Object.entries(action.payload)) {
        state[id] = name;
      }
    },
  },
});

export const { addDictionaryProviders } = dictionarySlice.actions;
export default dictionarySlice.reducer;

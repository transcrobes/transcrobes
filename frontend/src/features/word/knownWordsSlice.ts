import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { KnownWords, SerialisableStringSet } from "../../lib/types";

const initialState = {
  knownWordGraphs: undefined,
} as Partial<KnownWords>;

const knownWordsSlice = createSlice({
  name: "knownWords",
  initialState,
  reducers: {
    setKnownWordsState(state, action: PayloadAction<KnownWords | undefined>) {
      return action.payload;
    },
    addKnownWords(state, action: PayloadAction<SerialisableStringSet>) {
      state.knownWordGraphs ??= {};
      for (const id in action.payload) {
        state.knownWordGraphs[id] = null;
      }
    },
  },
});

export const { setKnownWordsState, addKnownWords } = knownWordsSlice.actions;
export default knownWordsSlice.reducer;

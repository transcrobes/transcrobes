import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { SerialisableDayCardWords, SerialisableStringSet } from "../../lib/types";

const initialState = {
  knownCardWordGraphs: undefined,
  allCardWordGraphs: undefined,
  knownWordIdsCounter: undefined,
} as Partial<SerialisableDayCardWords>;

const cardsSlice = createSlice({
  name: "knownCards",
  initialState,
  reducers: {
    setCardWordsState(state, action: PayloadAction<SerialisableDayCardWords>) {
      return action.payload;
    },
    addKnownCards(state, action: PayloadAction<SerialisableStringSet>) {
      state.knownCardWordGraphs ??= {};
      state.allCardWordGraphs ??= {};
      for (const id in action.payload) {
        state.knownCardWordGraphs[id] = null;
        // FIXME: is this needed?
        state.allCardWordGraphs[id] = null;
      }
    },
  },
});

export const { setCardWordsState, addKnownCards } = cardsSlice.actions;
export default cardsSlice.reducer;

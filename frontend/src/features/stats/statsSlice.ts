import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { toEnrich } from "../../lib/funclib";
import { ContentStats, ModelType, SerialisableStringSet } from "../../lib/types";

const initialState: ContentStats = {
  knownChars: {},
  chars: {},
  knownWords: {},
  words: {},
  sentenceLengths: {},
};

const statsSlice = createSlice({
  name: "stats",
  initialState,
  reducers: {
    setStats(state, action: PayloadAction<ContentStats>) {
      state = action.payload;
    },
    addModelsToState(
      state,
      action: PayloadAction<{ model: ModelType; knownWords: SerialisableStringSet; knownChars: SerialisableStringSet }>,
    ) {
      for (const sentence of action.payload.model.s) {
        if (sentence.t.length > 5) {
          state.sentenceLengths[sentence.t.length] = (state.sentenceLengths[sentence.t.length] || 0) + 1;
        }
        for (const word of sentence.t) {
          if (["PU", "URL", "FW"].includes(word.pos || "") || !toEnrich(word.l)) continue;
          state.words[word.l] = (state.words[word.l] || 0) + 1;
          if (word.l in action.payload.knownWords) {
            state.knownWords[word.l] = (state.knownWords[word.l] || 0) + 1;
          }
          for (const char of word.l) {
            if (!toEnrich(char)) continue;
            if (char in action.payload.knownChars) {
              state.knownChars[char] = (state.knownChars[char] || 0) + 1;
            }
            state.chars[char] = (state.chars[char] || 0) + 1;
          }
        }
      }
    },
  },
});

export const { setStats, addModelsToState } = statsSlice.actions;
export default statsSlice.reducer;

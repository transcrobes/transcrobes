import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { toEnrich } from "../../lib/funclib";
import {
  ContentStats,
  MIN_LENGTH_FOR_SENTENCE,
  ModelType,
  SerialisableStringSet,
  InputLanguage,
} from "../../lib/types";

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
      action: PayloadAction<{
        model: ModelType;
        knownWords: SerialisableStringSet;
        knownChars: SerialisableStringSet;
        fromLang: InputLanguage;
      }>,
    ) {
      for (const sentence of action.payload.model.s) {
        if (sentence.t.length >= MIN_LENGTH_FOR_SENTENCE) {
          state.sentenceLengths[sentence.t.length] = (state.sentenceLengths[sentence.t.length] || 0) + 1;
        }
        for (const word of sentence.t) {
          if (["PU", "URL", "FW"].includes(word.pos || "") || !toEnrich(word.l, action.payload.fromLang)) {
            continue;
          }
          state.words[word.l] = (state.words[word.l] || 0) + 1;
          if (word.l in action.payload.knownWords) {
            state.knownWords[word.l] = (state.knownWords[word.l] || 0) + 1;
          } else {
          }
          if (action.payload.fromLang === "zh-Hans") {
            for (const char of word.l) {
              if (!toEnrich(char, action.payload.fromLang)) continue;
              if (char in action.payload.knownChars) {
                state.knownChars[char] = (state.knownChars[char] || 0) + 1;
              }
              state.chars[char] = (state.chars[char] || 0) + 1;
            }
          }
        }
      }
    },
  },
});

export const { setStats, addModelsToState } = statsSlice.actions;
export default statsSlice.reducer;

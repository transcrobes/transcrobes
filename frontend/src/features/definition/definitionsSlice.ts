import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { DefinitionsState, DefinitionState } from "../../lib/types";

const initialState = {} as DefinitionsState;

const definitionsSlice = createSlice({
  name: "definitions",
  initialState,
  reducers: {
    updateDefinition(state, action: PayloadAction<DefinitionState>) {
      state[action.payload.id] = { ...action.payload };
    },
    addDefinitions(state, action: PayloadAction<DefinitionState[]>) {
      for (const definition of action.payload) {
        state[definition.id] = definition;
      }
    },
  },
});

export const { addDefinitions, updateDefinition } = definitionsSlice.actions;
export default definitionsSlice.reducer;

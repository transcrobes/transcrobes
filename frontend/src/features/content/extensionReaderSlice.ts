import { PayloadAction } from "@reduxjs/toolkit";
import {
  CornerPosition,
  DEFAULT_EXTENSION_READER_CONFIG_STATE,
  ExtensionReaderState,
  EXTENSION_READER_TYPE,
  GenericState,
  SystemLanguage,
  ThemeName,
} from "../../lib/types";
import { ContentConfigPayload, createGenericSlice } from "./contentSlice";

const extensionReaderSlice = createGenericSlice({
  name: EXTENSION_READER_TYPE,
  initialState: {} as GenericState<ExtensionReaderState>,
  defaultValue: DEFAULT_EXTENSION_READER_CONFIG_STATE,
  reducers: {
    setThemeName(state: GenericState<ExtensionReaderState>, action: PayloadAction<ContentConfigPayload<ThemeName>>) {
      state[action.payload.id] ??= DEFAULT_EXTENSION_READER_CONFIG_STATE;
      state[action.payload.id].themeName = action.payload.value;
    },
    setLocale(state: GenericState<ExtensionReaderState>, action: PayloadAction<ContentConfigPayload<SystemLanguage>>) {
      state[action.payload.id] ??= DEFAULT_EXTENSION_READER_CONFIG_STATE;
      state[action.payload.id].locale = action.payload.value;
    },
    setShowSuggestions(
      state: GenericState<ExtensionReaderState>,
      action: PayloadAction<ContentConfigPayload<boolean>>,
    ) {
      state[action.payload.id] ??= DEFAULT_EXTENSION_READER_CONFIG_STATE;
      state[action.payload.id].showSuggestions = action.payload.value;
    },
    setAnalysisPosition(
      state: GenericState<ExtensionReaderState>,
      action: PayloadAction<ContentConfigPayload<CornerPosition>>,
    ) {
      state[action.payload.id] ??= DEFAULT_EXTENSION_READER_CONFIG_STATE;
      state[action.payload.id].analysisPosition = action.payload.value;
    },
  },
});
export const extensionReaderActions = extensionReaderSlice.actions;
export type ExtensionReaderActions = typeof extensionReaderActions;
export default extensionReaderSlice.reducer;

import { ContentConfigPayload, createGenericSlice, EXTENSION_READER_TYPE } from "./contentSlice";
import { PayloadAction } from "@reduxjs/toolkit";
import { DEFAULT_READER_CONFIG_STATE, GenericState, ReaderState, ThemeName } from "../../lib/types";

export interface ExtensionReaderState extends ReaderState {
  showSuggestions: boolean;
  themeName: ThemeName;
  readerType: typeof EXTENSION_READER_TYPE;
}
export const EXTENSION_READER_ID = "extensionReader";

export const DEFAULT_EXTENSION_READER_CONFIG_STATE: ExtensionReaderState = {
  ...DEFAULT_READER_CONFIG_STATE,
  id: EXTENSION_READER_ID,
  showSuggestions: true,
  themeName: "light",
  readerType: EXTENSION_READER_TYPE,
};

const extensionReaderSlice = createGenericSlice({
  name: EXTENSION_READER_TYPE,
  initialState: {} as GenericState<ExtensionReaderState>,
  defaultValue: DEFAULT_EXTENSION_READER_CONFIG_STATE,
  reducers: {
    setThemeName(state: GenericState<ExtensionReaderState>, action: PayloadAction<ContentConfigPayload<ThemeName>>) {
      state[action.payload.id] = state[action.payload.id] || DEFAULT_EXTENSION_READER_CONFIG_STATE;
      state[action.payload.id].themeName = action.payload.value;
    },
    setShowSuggestions(
      state: GenericState<ExtensionReaderState>,
      action: PayloadAction<ContentConfigPayload<boolean>>,
    ) {
      state[action.payload.id] = state[action.payload.id] || DEFAULT_EXTENSION_READER_CONFIG_STATE;
      state[action.payload.id].showSuggestions = action.payload.value;
    },
  },
});
export const extensionReaderActions = extensionReaderSlice.actions;
export default extensionReaderSlice.reducer;

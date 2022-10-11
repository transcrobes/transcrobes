import {
  DEFAULT_READER_CONFIG_STATE,
  DEFAULT_RECENTS_READER_CONFIG_STATE,
  GenericState,
  RECENTS_READER_ID,
  SimpleReaderState,
  SIMPLE_READER_TYPE,
} from "../../lib/types";
import { createGenericSlice } from "./contentSlice";

const simpleReaderSlice = createGenericSlice({
  name: SIMPLE_READER_TYPE,
  // these are currently static values that shouldn't be set/saved
  initialState: {
    [RECENTS_READER_ID]: DEFAULT_RECENTS_READER_CONFIG_STATE,
  } as GenericState<SimpleReaderState>,
  defaultValue: DEFAULT_READER_CONFIG_STATE,
  reducers: {},
});
export const simpleReaderActions = simpleReaderSlice.actions;
export type SimpleReaderActions = typeof simpleReaderActions;
export default simpleReaderSlice.reducer;

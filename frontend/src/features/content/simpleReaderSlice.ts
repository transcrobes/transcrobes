import { DEFAULT_READER_CONFIG_STATE, GenericState, ReaderState, USER_STATS_MODE } from "../../lib/types";
import { createGenericSlice, SIMPLE_READER_TYPE } from "./contentSlice";

export const TEXT_READER_ID = "textReader";
export const WEB_READER_ID = "webReader";
export const RECENTS_READER_ID = "recentsReader";

export interface SimpleReaderState extends ReaderState {
  readerType: typeof SIMPLE_READER_TYPE;
}

export const DEFAULT_WEB_READER_CONFIG_STATE: SimpleReaderState = {
  ...DEFAULT_READER_CONFIG_STATE,
  id: WEB_READER_ID,
  readerType: SIMPLE_READER_TYPE,
};

export const DEFAULT_TEXT_READER_CONFIG_STATE: SimpleReaderState = {
  ...DEFAULT_READER_CONFIG_STATE,
  id: TEXT_READER_ID,
  readerType: SIMPLE_READER_TYPE,
};

export const DEFAULT_RECENTS_READER_CONFIG_STATE: SimpleReaderState = {
  ...DEFAULT_READER_CONFIG_STATE,
  id: RECENTS_READER_ID,
  readerType: SIMPLE_READER_TYPE,
  clickable: false,
  glossing: USER_STATS_MODE.NO_GLOSS,
  segmentation: true,
  collectRecents: false,
  mouseover: true,
};

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
export default simpleReaderSlice.reducer;

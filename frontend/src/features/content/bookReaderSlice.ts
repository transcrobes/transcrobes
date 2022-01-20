import { BOOK_READER_TYPE, ContentConfigPayload, createGenericSlice } from "./contentSlice";
import { PayloadAction } from "@reduxjs/toolkit";
import { HslColor } from "react-colorful";
// import { Locator } from "@d-i-t-a/reader";
import { DEFAULT_READER_CONFIG_STATE, GenericState, ReaderState } from "../../lib/types";

export interface BookReaderState extends ReaderState {
  fontColour: HslColor | null;
  isScrolling: boolean;
  currentTocUrl: string | null;
  atStart: boolean;
  atEnd: boolean;
  // location?: Locator | undefined;
  location?: any | undefined;
  readerType: typeof BOOK_READER_TYPE;
}

export const DEFAULT_BOOK_READER_CONFIG_STATE: BookReaderState = {
  ...DEFAULT_READER_CONFIG_STATE,
  id: "",
  readerType: BOOK_READER_TYPE,
  isScrolling: false,
  currentTocUrl: null,
  atStart: true,
  atEnd: false,
  location: undefined,
};

const bookReaderSlice = createGenericSlice({
  name: BOOK_READER_TYPE,
  initialState: {} as GenericState<BookReaderState>,
  defaultValue: DEFAULT_BOOK_READER_CONFIG_STATE,
  reducers: {
    setScroll(state: GenericState<BookReaderState>, action: PayloadAction<ContentConfigPayload<boolean>>) {
      state[action.payload.id] = state[action.payload.id] || DEFAULT_BOOK_READER_CONFIG_STATE;
      state[action.payload.id].isScrolling = action.payload.value;
    },
    setCurrentTocUrl(state: GenericState<BookReaderState>, action: PayloadAction<ContentConfigPayload<string>>) {
      state[action.payload.id] = state[action.payload.id] || DEFAULT_BOOK_READER_CONFIG_STATE;
      state[action.payload.id].currentTocUrl = action.payload.value;
    },
    setLocationChanged(state: GenericState<BookReaderState>, action: PayloadAction<ContentConfigPayload<any>>) {
      state[action.payload.id] = state[action.payload.id] || DEFAULT_BOOK_READER_CONFIG_STATE;
      state[action.payload.id].location = action.payload.value;
    },
    setBookBoundaryChanged(
      state: GenericState<BookReaderState>,
      action: PayloadAction<ContentConfigPayload<{ atStart: boolean; atEnd: boolean }>>,
    ) {
      state[action.payload.id] = state[action.payload.id] || DEFAULT_BOOK_READER_CONFIG_STATE;
      state[action.payload.id].atEnd = action.payload.value.atEnd;
      state[action.payload.id].atStart = action.payload.value.atStart;
    },
  },
});
export const bookReaderActions = bookReaderSlice.actions;
export default bookReaderSlice.reducer;

import { PayloadAction } from "@reduxjs/toolkit";
import { ContentConfigPayload, createGenericSlice } from "./contentSlice";
// import { Locator } from "@d-i-t-a/reader";
import { BookReaderState, BOOK_READER_TYPE, DEFAULT_BOOK_READER_CONFIG_STATE, GenericState } from "../../lib/types";

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
    setPageMargins(state: GenericState<BookReaderState>, action: PayloadAction<ContentConfigPayload<number>>) {
      state[action.payload.id] = state[action.payload.id] || DEFAULT_BOOK_READER_CONFIG_STATE;
      state[action.payload.id].pageMargins = action.payload.value;
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
export type BookReaderActions = typeof bookReaderActions;
export default bookReaderSlice.reducer;

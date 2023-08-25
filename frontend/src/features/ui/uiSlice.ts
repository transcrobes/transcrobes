import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { EventCoordinates, SentenceType, TokenType } from "../../lib/types";

export type DOMRectangle = {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
};

export type TokenDetailsState = {
  token: TokenType;
  sentence: SentenceType;
  coordinates: EventCoordinates;
  sourceRect: DOMRectangle;
  gloss: boolean;
};

export type PopoverState = {
  token: TokenType;
  sentence: SentenceType;
  coordinates: EventCoordinates;
};

type UIState = {
  tokenDetails: TokenDetailsState | undefined;
  mouseover: PopoverState | undefined;
  loading: boolean | undefined;
  loadingMessage: string | undefined;
  ignoreBeginner: boolean | undefined;
  needsBeginner: boolean | undefined;
  rxdbInited: boolean;
  sqliteInited: boolean;
};

const initialState = {
  tokenDetails: undefined,
  mouseover: undefined,
  loading: undefined,
  loadingMessage: undefined,
  ignoreBeginner: undefined,
  needsBeginner: undefined,
  rxdbInited: false,
  sqliteInited: false,
} as UIState;

const uiSlice = createSlice({
  name: "ui",
  initialState,
  reducers: {
    setMouseover(state, action: PayloadAction<PopoverState | undefined>) {
      state.mouseover = action.payload;
    },
    setTokenDetails(state, action: PayloadAction<TokenDetailsState | undefined>) {
      state.tokenDetails = action.payload;
    },
    setLoading(state, action: PayloadAction<boolean | undefined>) {
      state.loading = action.payload;
    },
    setLoadingMessage(state, action: PayloadAction<string | undefined>) {
      state.loadingMessage = action.payload;
    },
    setIgnoreBeginner(state, action: PayloadAction<boolean | undefined>) {
      state.ignoreBeginner = action.payload;
    },
    setNeedsBeginner(state, action: PayloadAction<boolean | undefined>) {
      state.needsBeginner = action.payload;
    },
    setRxdbInited(state, action: PayloadAction<boolean>) {
      state.rxdbInited = action.payload;
    },
    setSqliteInited(state, action: PayloadAction<boolean>) {
      state.sqliteInited = action.payload;
    },
  },
});

export const {
  setTokenDetails,
  setMouseover,
  setLoading,
  setLoadingMessage,
  setIgnoreBeginner,
  setNeedsBeginner,
  setRxdbInited,
  setSqliteInited,
} = uiSlice.actions;
export default uiSlice.reducer;

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
};

const initialState = {
  tokenDetails: undefined,
  mouseover: undefined,
  loading: undefined,
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
  },
});

export const { setTokenDetails, setMouseover, setLoading } = uiSlice.actions;
export default uiSlice.reducer;

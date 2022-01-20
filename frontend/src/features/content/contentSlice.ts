// they call this the DUCKS pattern...
import { AnyAction, createSlice, PayloadAction, SliceCaseReducers, ValidateSliceCaseReducers } from "@reduxjs/toolkit";
import { HslColor } from "react-colorful";
import { AbstractWorkerProxy, platformHelper } from "../../lib/proxies";
import {
  ContentConfigType,
  FontFamily,
  FontFamilyChinese,
  GenericState,
  GlossPosition,
  ReaderState,
} from "../../lib/types";

export const VIDEO_READER_TYPE = "videoReader";
export const BOOK_READER_TYPE = "bookReader";
export const SIMPLE_READER_TYPE = "simpleReader";

export function handleConfigUpdate<T extends ReaderState>(newConfig: T, id: string, proxy: AbstractWorkerProxy): void {
  const configToSave: ContentConfigType = {
    id: id,
    configString: JSON.stringify({ readerState: newConfig }),
  };
  proxy.sendMessagePromise({
    source: "contentSlice.ts",
    type: "setContentConfigToStore",
    value: configToSave,
  });
}
export type ContentConfigPayload<T> = {
  id: string;
  value: T;
};

export const createGenericSlice = <T extends ReaderState, Reducers extends SliceCaseReducers<GenericState<T>>>({
  name = "",
  initialState,
  defaultValue,
  reducers,
}: {
  name: string;
  initialState: GenericState<T>;
  defaultValue: T;
  reducers: ValidateSliceCaseReducers<GenericState<T>, Reducers>;
}) => {
  return createSlice({
    name,
    initialState,
    reducers: {
      setFontFamily(state: GenericState<T>, action: PayloadAction<ContentConfigPayload<FontFamily>>) {
        state[action.payload.id] = state[action.payload.id] || defaultValue;
        state[action.payload.id].fontFamily = action.payload.value;
      },
      setFontFamilyChinese(state: GenericState<T>, action: PayloadAction<ContentConfigPayload<FontFamilyChinese>>) {
        state[action.payload.id] = state[action.payload.id] || defaultValue;
        state[action.payload.id].fontFamilyChinese = action.payload.value;
      },
      setGlossing(state: GenericState<T>, action: PayloadAction<ContentConfigPayload<number>>) {
        state[action.payload.id] = state[action.payload.id] || defaultValue;
        state[action.payload.id].glossing = action.payload.value;
      },
      setFontSize(state: GenericState<T>, action: PayloadAction<ContentConfigPayload<number>>) {
        state[action.payload.id] = state[action.payload.id] || defaultValue;
        state[action.payload.id].fontSize = action.payload.value;
      },
      setFontColour(state: GenericState<T>, action: PayloadAction<ContentConfigPayload<HslColor | null>>) {
        state[action.payload.id] = state[action.payload.id] || defaultValue;
        state[action.payload.id].fontColour = action.payload.value;
      },
      setGlossFontSize(state: GenericState<T>, action: PayloadAction<ContentConfigPayload<number>>) {
        state[action.payload.id] = state[action.payload.id] || defaultValue;
        state[action.payload.id].glossFontSize = action.payload.value;
      },
      setGlossFontColour(state: GenericState<T>, action: PayloadAction<ContentConfigPayload<HslColor | null>>) {
        state[action.payload.id] = state[action.payload.id] || defaultValue;
        state[action.payload.id].glossFontColour = action.payload.value;
      },
      setGlossPosition(state: GenericState<T>, action: PayloadAction<ContentConfigPayload<GlossPosition>>) {
        state[action.payload.id] = state[action.payload.id] || defaultValue;
        state[action.payload.id].glossPosition = action.payload.value;
      },
      setCollectRecents(state: GenericState<T>, action: PayloadAction<ContentConfigPayload<boolean>>) {
        state[action.payload.id] = state[action.payload.id] || defaultValue;
        state[action.payload.id].collectRecents = action.payload.value;
      },
      setSegmentation(state: GenericState<T>, action: PayloadAction<ContentConfigPayload<boolean>>) {
        state[action.payload.id] = state[action.payload.id] || defaultValue;
        state[action.payload.id].segmentation = action.payload.value;
      },
      setMouseover(state: GenericState<T>, action: PayloadAction<ContentConfigPayload<boolean>>) {
        state[action.payload.id] = state[action.payload.id] || defaultValue;
        state[action.payload.id].mouseover = action.payload.value;
      },
      setState<T extends ReaderState>(state: GenericState<T>, action: PayloadAction<ContentConfigPayload<T>>) {
        state[action.payload.id] = action.payload.value;
      },

      /**
       * If you want to write to values of the state that depend on the generic
       * (in this case: `state.data`, which is T), you might need to specify the
       * State type manually here, as it defaults to `Draft<GenericState<T>>`,
       * which can sometimes be problematic with yet-unresolved generics.
       * This is a general problem when working with immer's Draft type and generics.
       */
      // success(state: GenericState<T>, action: PayloadAction<T>) {
      //   state.data = action.payload;
      //   state.status = "finished";
      // },
      ...reducers,
    },
    extraReducers: (builder) => {
      builder.addMatcher(
        (action: AnyAction) => {
          return (
            action.type.startsWith(`${BOOK_READER_TYPE}/`) ||
            action.type.startsWith(`${VIDEO_READER_TYPE}/`) ||
            action.type.startsWith(`${SIMPLE_READER_TYPE}/`)
          );
        },
        (state, action: AnyAction) => {
          if (!platformHelper.loaded) {
            console.log("platformhelper not loaded", platformHelper.loaded);
            return;
          }
          const id = (action as PayloadAction<ContentConfigPayload<unknown>>).payload.id;
          if (state[id]) {
            handleConfigUpdate(state[id], id, platformHelper);
          }
        },
      );
    },
  });
};

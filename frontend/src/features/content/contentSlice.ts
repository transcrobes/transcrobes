// they call this the DUCKS pattern...
import { AnyAction, createSlice, PayloadAction, SliceCaseReducers, ValidateSliceCaseReducers } from "@reduxjs/toolkit";
import _ from "lodash";
import { HslColor } from "react-colorful";
import {
  BOOK_READER_TYPE,
  ContentConfigType,
  EXTENSION_READER_TYPE,
  FontColourType,
  FontFamily,
  FontFamilyChinese,
  FontShadowType,
  GenericState,
  GlossPosition,
  ReaderState,
  SIMPLE_READER_TYPE,
  VIDEO_READER_TYPE,
} from "../../lib/types";
import { DataManager } from "../../data/types";
import { platformHelper } from "../../app/createStore";

export function handleConfigUpdate<T extends ReaderState>(newConfig: T, id: string, proxy: DataManager): void {
  const configToSave: ContentConfigType = {
    id: id,
    configString: JSON.stringify({ readerState: newConfig }),
  };
  // console.debug("Saving config to store", configToSave);
  proxy.setContentConfigToStore(configToSave);
  // These are for default values, rather than starting from scratch
  if (["bookReader", "videoReader"].includes(newConfig.readerType)) {
    proxy.setContentConfigToStore({ ...configToSave, id: newConfig.readerType });
  }
}
export type ContentConfigPayload<T> = {
  id: string;
  value: T;
};

export async function getRawState(proxy: DataManager, id: string) {
  const raw = await proxy.getContentConfigFromStore(id);
  return raw?.configString ? JSON.parse(raw.configString).readerState : null;
}

export async function getRefreshedState<T extends ReaderState>(
  proxy: DataManager,
  defaultConfig: T,
  id: string,
): Promise<T> {
  const config = await getRawState(proxy, id);
  const conf: T = !config
    ? _.cloneDeep({ ...defaultConfig, id })
    : {
        ..._.cloneDeep({ ...defaultConfig, id }),
        ...config,
      };
  return conf;
}

// export type SetFontFamily<T extends ReaderState> = (
//   state: GenericState<T>,
//   action: PayloadAction<ContentConfigPayload<FontFamily | FontFamilyChinese>>,
// ) => void;

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
      setFontFamilyGloss(
        state: GenericState<T>,
        action: PayloadAction<ContentConfigPayload<FontFamily | FontFamilyChinese>>,
      ) {
        state[action.payload.id] = state[action.payload.id] || defaultValue;
        state[action.payload.id].fontFamilyGloss = action.payload.value;
      },
      setFontFamilyMain(
        state: GenericState<T>,
        action: PayloadAction<ContentConfigPayload<FontFamily | FontFamilyChinese>>,
      ) {
        state[action.payload.id] = state[action.payload.id] || defaultValue;
        state[action.payload.id].fontFamilyMain = action.payload.value;
      },
      setGlossing(state: GenericState<T>, action: PayloadAction<ContentConfigPayload<number>>) {
        state[action.payload.id] = state[action.payload.id] || defaultValue;
        state[action.payload.id].glossing = action.payload.value;
      },
      setFontSize(state: GenericState<T>, action: PayloadAction<ContentConfigPayload<number>>) {
        state[action.payload.id] = state[action.payload.id] || defaultValue;
        state[action.payload.id].fontSize = action.payload.value;
      },
      setFontColour(state: GenericState<T>, action: PayloadAction<ContentConfigPayload<FontColourType>>) {
        state[action.payload.id] = state[action.payload.id] || defaultValue;
        state[action.payload.id].fontColour = action.payload.value;
      },
      setFontTextShadow(state: GenericState<T>, action: PayloadAction<ContentConfigPayload<FontShadowType>>) {
        state[action.payload.id] = state[action.payload.id] || defaultValue;
        state[action.payload.id].fontTextShadow = action.payload.value;
      },
      setGlossFontSize(state: GenericState<T>, action: PayloadAction<ContentConfigPayload<number>>) {
        state[action.payload.id] = state[action.payload.id] || defaultValue;
        state[action.payload.id].glossFontSize = action.payload.value;
      },
      setGlossFontColour(state: GenericState<T>, action: PayloadAction<ContentConfigPayload<HslColor | null>>) {
        state[action.payload.id] = state[action.payload.id] || defaultValue;
        state[action.payload.id].glossFontColour = action.payload.value;
      },
      setGlossUnsureBackgroundColour(
        state: GenericState<T>,
        action: PayloadAction<ContentConfigPayload<HslColor | null>>,
      ) {
        state[action.payload.id] = state[action.payload.id] || defaultValue;
        state[action.payload.id].glossUnsureBackgroundColour = action.payload.value;
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
      setSayOnMouseover(state: GenericState<T>, action: PayloadAction<ContentConfigPayload<boolean>>) {
        state[action.payload.id] = state[action.payload.id] || defaultValue;
        state[action.payload.id].sayOnMouseover = action.payload.value;
      },
      setStrictProviderOrdering(state: GenericState<T>, action: PayloadAction<ContentConfigPayload<boolean>>) {
        state[action.payload.id] = state[action.payload.id] || defaultValue;
        state[action.payload.id].strictProviderOrdering = action.payload.value;
      },
      setTranslationProviderOrder(
        state: GenericState<T>,
        action: PayloadAction<ContentConfigPayload<Record<string, number>>>,
      ) {
        state[action.payload.id] = state[action.payload.id] || defaultValue;
        state[action.payload.id].translationProviderOrder = action.payload.value;
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
            action.type.startsWith(`${EXTENSION_READER_TYPE}/`) ||
            action.type.startsWith(`${SIMPLE_READER_TYPE}/`)
          );
        },
        (state, action: AnyAction) => {
          const id = (action as PayloadAction<ContentConfigPayload<unknown>>).payload.id;
          if (state[id]) {
            handleConfigUpdate(state[id], id, platformHelper);
          }
        },
      );
    },
  });
};

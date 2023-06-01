import { PayloadAction } from "@reduxjs/toolkit";
import {
  DEFAULT_VIDEO_READER_CONFIG_STATE,
  GenericState,
  SubPosition,
  TimeDisplayFormat,
  VideoReaderState,
  VIDEO_READER_TYPE,
} from "../../lib/types";
import { ContentConfigPayload, createGenericSlice } from "./contentSlice";

const videoReaderSlice = createGenericSlice({
  name: VIDEO_READER_TYPE,
  initialState: {} as GenericState<VideoReaderState>,
  defaultValue: DEFAULT_VIDEO_READER_CONFIG_STATE,
  reducers: {
    setSubPosition(state: GenericState<VideoReaderState>, action: PayloadAction<ContentConfigPayload<SubPosition>>) {
      state[action.payload.id] = state[action.payload.id] || DEFAULT_VIDEO_READER_CONFIG_STATE;
      state[action.payload.id].subPosition = action.payload.value;
    },
    setDelay(state: GenericState<VideoReaderState>, action: PayloadAction<ContentConfigPayload<number>>) {
      state[action.payload.id] = state[action.payload.id] || DEFAULT_VIDEO_READER_CONFIG_STATE;
      state[action.payload.id].subDelay = action.payload.value;
    },
    setSubRaise(state: GenericState<VideoReaderState>, action: PayloadAction<ContentConfigPayload<number>>) {
      state[action.payload.id] = state[action.payload.id] || DEFAULT_VIDEO_READER_CONFIG_STATE;
      state[action.payload.id].subRaise = action.payload.value;
    },
    setSubBoxWidth(state: GenericState<VideoReaderState>, action: PayloadAction<ContentConfigPayload<number>>) {
      state[action.payload.id] = state[action.payload.id] || DEFAULT_VIDEO_READER_CONFIG_STATE;
      state[action.payload.id].subBoxWidth = action.payload.value;
    },
    setSubPlaybackRate(state: GenericState<VideoReaderState>, action: PayloadAction<ContentConfigPayload<number>>) {
      state[action.payload.id] = state[action.payload.id] || DEFAULT_VIDEO_READER_CONFIG_STATE;
      state[action.payload.id].subPlaybackRate = action.payload.value;
    },
    setSubBackgroundBlur(state: GenericState<VideoReaderState>, action: PayloadAction<ContentConfigPayload<boolean>>) {
      state[action.payload.id] = state[action.payload.id] || DEFAULT_VIDEO_READER_CONFIG_STATE;
      state[action.payload.id].subBackgroundBlur = action.payload.value;
    },
    setPlaybackRate(state: GenericState<VideoReaderState>, action: PayloadAction<ContentConfigPayload<number>>) {
      state[action.payload.id] = state[action.payload.id] || DEFAULT_VIDEO_READER_CONFIG_STATE;
      state[action.payload.id].playbackRate = action.payload.value;
    },
    setVolume(state: GenericState<VideoReaderState>, action: PayloadAction<ContentConfigPayload<number>>) {
      state[action.payload.id] = state[action.payload.id] || DEFAULT_VIDEO_READER_CONFIG_STATE;
      state[action.payload.id].volume = action.payload.value;
    },
    setVolumeBoost(state: GenericState<VideoReaderState>, action: PayloadAction<ContentConfigPayload<number>>) {
      state[action.payload.id] = state[action.payload.id] || DEFAULT_VIDEO_READER_CONFIG_STATE;
      state[action.payload.id].volumeBoost = action.payload.value;
    },
    setPlayed(state: GenericState<VideoReaderState>, action: PayloadAction<ContentConfigPayload<number>>) {
      state[action.payload.id] = state[action.payload.id] || DEFAULT_VIDEO_READER_CONFIG_STATE;
      state[action.payload.id].played = action.payload.value;
    },
    setMuted(state: GenericState<VideoReaderState>, action: PayloadAction<ContentConfigPayload<boolean>>) {
      state[action.payload.id] = state[action.payload.id] || DEFAULT_VIDEO_READER_CONFIG_STATE;
      state[action.payload.id].muted = action.payload.value;
    },
    setTimeDisplayFormat(
      state: GenericState<VideoReaderState>,
      action: PayloadAction<ContentConfigPayload<TimeDisplayFormat>>,
    ) {
      state[action.payload.id] = state[action.payload.id] || DEFAULT_VIDEO_READER_CONFIG_STATE;
      state[action.payload.id].timeDisplayFormat = action.payload.value;
    },
  },
});

export const videoReaderActions = videoReaderSlice.actions;
export type VideoReaderActions = typeof videoReaderActions;
export default videoReaderSlice.reducer;

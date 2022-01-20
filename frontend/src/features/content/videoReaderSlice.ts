import { PayloadAction } from "@reduxjs/toolkit";
import { SubPosition } from "../../contents/common/types";
import { DEFAULT_READER_CONFIG_STATE, GenericState, ReaderState } from "../../lib/types";
import { ContentConfigPayload, createGenericSlice, VIDEO_READER_TYPE } from "./contentSlice";

type TimeDisplayFormat = "remaining" | "normal";

export interface VideoReaderState extends ReaderState {
  volume: number;
  played: number;
  muted: boolean;
  timeDisplayFormat: TimeDisplayFormat;
  playbackRate: number;
  subPlaybackRate: number;
  subBoxWidth: number;
  subDelay: number;
  subPosition: SubPosition;
  readerType: typeof VIDEO_READER_TYPE;
}

export const DEFAULT_VIDEO_READER_CONFIG_STATE: VideoReaderState = {
  ...DEFAULT_READER_CONFIG_STATE,
  id: "",
  fontSize: 1.5,
  fontColour: { h: 0, s: 0, l: 100 },
  glossFontColour: { h: 0, s: 0, l: 100 },
  playbackRate: 1.0,
  subPlaybackRate: 1.0,
  subBoxWidth: 0.8,
  subDelay: 0,
  subPosition: "bottom",
  volume: 1,
  played: 0,
  timeDisplayFormat: "normal",
  muted: false,
  readerType: VIDEO_READER_TYPE,
};

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
    setSubBoxWidth(state: GenericState<VideoReaderState>, action: PayloadAction<ContentConfigPayload<number>>) {
      state[action.payload.id] = state[action.payload.id] || DEFAULT_VIDEO_READER_CONFIG_STATE;
      state[action.payload.id].subBoxWidth = action.payload.value;
    },
    setSubPlaybackRate(state: GenericState<VideoReaderState>, action: PayloadAction<ContentConfigPayload<number>>) {
      state[action.payload.id] = state[action.payload.id] || DEFAULT_VIDEO_READER_CONFIG_STATE;
      state[action.payload.id].subPlaybackRate = action.payload.value;
    },
    setPlaybackRate(state: GenericState<VideoReaderState>, action: PayloadAction<ContentConfigPayload<number>>) {
      state[action.payload.id] = state[action.payload.id] || DEFAULT_VIDEO_READER_CONFIG_STATE;
      state[action.payload.id].playbackRate = action.payload.value;
    },
    setVolume(state: GenericState<VideoReaderState>, action: PayloadAction<ContentConfigPayload<number>>) {
      state[action.payload.id] = state[action.payload.id] || DEFAULT_VIDEO_READER_CONFIG_STATE;
      state[action.payload.id].volume = action.payload.value;
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
export default videoReaderSlice.reducer;

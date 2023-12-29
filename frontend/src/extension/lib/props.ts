import PropTypes from "prop-types";

const { string, bool, number, array, oneOfType, shape, object, func, node } = PropTypes;

export const propTypes = {
  url: oneOfType([string, array, object]),
  playing: bool,
  loop: bool,
  controls: bool,
  volume: number,
  muted: bool,
  playbackRate: number,
  width: oneOfType([string, number]),
  height: oneOfType([string, number]),
  style: object,
  progressInterval: number,
  stopOnUnmount: bool,
  playIcon: node,
  previewTabIndex: number,
  wrapper: oneOfType([string, func, shape({ render: func.isRequired })]),
  config: shape({
    transcrobesLayer: shape({ cues: object }),
    file: shape({
      attributes: object,
      tracks: array,
    }),
  }),
  onReady: func,
  onStart: func,
  onPlay: func,
  onPause: func,
  onBuffer: func,
  onBufferEnd: func,
  onEnded: func,
  onError: func,
  onDuration: func,
  onSeek: func,
  onPlaybackRateChange: func,
  onPlaybackQualityChange: func,
  onProgress: func,
};

const noop = () => {};

export const defaultProps = {
  playing: false,
  loop: false,
  controls: false,
  volume: null,
  muted: false,
  playbackRate: 1,
  width: "640px",
  height: "360px",
  style: {},
  progressInterval: 1000,
  stopOnUnmount: true,
  wrapper: "div",
  previewTabIndex: 0,
  config: {
    file: {
      attributes: {},
      tracks: [],
    },
  },
  onReady: noop,
  onStart: noop,
  onPlay: noop,
  onPause: noop,
  onBuffer: noop,
  onBufferEnd: noop,
  onEnded: noop,
  onError: noop,
  onDuration: noop,
  onSeek: noop,
  onPlaybackRateChange: noop,
  onPlaybackQualityChange: noop,
  onProgress: noop,
};

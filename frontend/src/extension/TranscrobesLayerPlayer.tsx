import { Box } from "@mui/material";
import React, { Component } from "react";
import { BaseReactPlayerProps } from "react-player/base";
import { Cue } from "webvtt-parser";
import { getStreamerVideoElement } from "../lib/componentMethods";
import { streamingSite } from "../lib/libMethods";
import { platformHelper } from "../lib/proxies";

/*
  Things to do:
  - make it so that the popup stays inside the screen when fullscreen on yk and nf
*/

interface TranscrobesLayerPlayerConfig {
  transcrobesLayer: {
    cues: Cue[];
  };
}

interface TranscrobesLayerPlayerProps extends BaseReactPlayerProps {
  config?: TranscrobesLayerPlayerConfig;
}

export default class TranscrobesLayerPlayer extends Component<TranscrobesLayerPlayerProps> {
  static displayName = "TranscrobesLayer";
  static canPlay = (url: string) => !!streamingSite(url);

  private divRef: React.RefObject<HTMLDivElement>;
  constructor(props: BaseReactPlayerProps | Readonly<BaseReactPlayerProps>) {
    super(props);
    this.divRef = React.createRef<HTMLDivElement>();
  }
  player: HTMLVideoElement;

  componentDidMount() {
    // We should never actually attempt to mount if we aren't supported...
    this.player = getStreamerVideoElement(document, streamingSite(location.href)!)!;
    this.addListeners(this.player);
    this.props.onMount && this.props.onMount(this);
  }

  componentWillUnmount() {
    this.player.src = "";
    this.removeListeners(this.player);
  }

  componentDidUpdate(prevProps: Readonly<BaseReactPlayerProps>, prevState: Readonly<{}>, snapshot?: any): void {
    if (prevProps.playing !== this.props.playing) {
      if (!this.props.playing) {
        this.pause();
      } else {
        this.play();
      }
    }
  }

  addListeners(player: HTMLVideoElement) {
    player.addEventListener("canplay", this.onReady);
    player.addEventListener("play", this.onPlay);
    player.addEventListener("waiting", this.onBuffer);
    player.addEventListener("playing", this.onBufferEnd);
    player.addEventListener("pause", this.onPause);
    player.addEventListener("seeked", this.onSeek);
    player.addEventListener("ended", this.onEnded);
    player.addEventListener("error", this.onError);
    player.addEventListener("ratechange", this.onPlayBackRateChange);
  }
  removeListeners(player: HTMLVideoElement) {
    player.removeEventListener("canplay", this.onReady);
    player.removeEventListener("play", this.onPlay);
    player.removeEventListener("waiting", this.onBuffer);
    player.removeEventListener("playing", this.onBufferEnd);
    player.removeEventListener("pause", this.onPause);
    player.removeEventListener("seeked", this.onSeek);
    player.removeEventListener("ended", this.onEnded);
    player.removeEventListener("error", this.onError);
    player.removeEventListener("ratechange", this.onPlayBackRateChange);
  }
  // @ts-ignore
  onReady = (...args) => this.props.onReady?.(...args);
  onPlay = () => this.props.onPlay?.();
  onBuffer = () => this.props.onBuffer?.();
  onBufferEnd = () => this.props.onBufferEnd?.();
  onPause = () => this.props.onPause?.();
  onEnded = () => this.props.onEnded?.();
  onError = (error: any, data?: any, hlsInstance?: any, hlsGlobal?: any) =>
    this.props.onError?.(error, data, hlsInstance, hlsGlobal);
  onPlayBackRateChange = (event) => this.props.onPlaybackRateChange(event.target.playbackRate);
  onSeek = (e) => {
    this.props.onSeek?.(e.target.currentTime);
  };

  load(url, isReady) {
    if (this.player) {
      if (this.props.config?.transcrobesLayer?.cues) {
        const track = this.player.addTextTrack("subtitles", "", "");
        track.mode = "hidden";
        for (const cue of this.props.config.transcrobesLayer.cues) {
          // FIXME: the available properties are pretty slim pickins here, and ASS might be
          // a better format in the long run. Later...
          track.addCue(new VTTCue(cue.startTime, cue.endTime, cue.text));
        }
      } else {
        throw new Error("TranscrobesLayerPlayer requires config.transcrobesLayer.cues");
      }

      this.divRef.current?.appendChild(this.player);
    }
  }

  play() {
    const promise = this.player.play();
    if (promise) {
      promise.catch(this.props.onError);
    }
  }

  pause() {
    this.player.pause();
  }

  stop() {
    this.player.removeAttribute("src");
  }

  seekTo(seconds: number) {
    if (streamingSite(location.href) === "netflix") {
      platformHelper.sendMessagePromise({
        source: "tlp",
        type: "seekNetflix",
        value: seconds,
      });
    } else {
      this.player.currentTime = seconds;
    }
  }

  setVolume(fraction: number) {
    this.player.volume = fraction;
  }

  mute = () => {
    this.player.muted = true;
  };

  unmute = () => {
    this.player.muted = false;
  };

  setPlaybackRate(rate: number) {
    try {
      this.player.playbackRate = rate;
    } catch (error) {
      this.props.onError?.(error);
    }
  }

  getDuration() {
    if (!this.player) return null;
    const { duration, seekable } = this.player;
    // on iOS, live streams return Infinity for the duration
    // so instead we use the end of the seekable timerange
    if (duration === Infinity && seekable.length > 0) {
      return seekable.end(seekable.length - 1);
    }
    return duration;
  }
  getCurrentTime() {
    if (!this.player) return null;
    return this.player.currentTime;
  }

  getSecondsLoaded() {
    if (!this.player) return null;
    const { buffered } = this.player;
    if (buffered.length === 0) {
      return 0;
    }
    const end = buffered.end(buffered.length - 1);
    const duration = this.getDuration();
    if (duration && end > duration) {
      return duration;
    }
    return null;
  }
  render() {
    return (
      <Box
        ref={this.divRef}
        sx={{
          // this is mainly for netflix so it takes the whole page, but only the whole page
          video: {
            left: "50%",
            margin: "0px",
            position: "absolute",
            top: "50%",
            transform: "translate(-50%, -50%)",
          },
        }}
      />
    );
  }
}

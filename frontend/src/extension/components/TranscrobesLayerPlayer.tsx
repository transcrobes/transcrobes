import { Box } from "@mui/material";
import * as Comlink from "comlink";
import React, { Component } from "react";
import { I18nContext } from "react-admin";
import { BaseReactPlayerProps } from "react-player/base";
import type { Runtime } from "webextension-polyfill";
import { Cue } from "webvtt-parser";
import { store } from "../../app/createStore";
import { setLoading, setLoadingMessage } from "../../features/ui/uiSlice";
import { getStreamerVideoElement } from "../../lib/componentMethods";
import { streamingSite } from "../../lib/libMethods";
import type { BackgroundWorkerTabManager } from "../backgroundfn";
import { createEndpoint } from "../lib/adapter";

const proxy = Comlink.wrap<BackgroundWorkerTabManager>(createEndpoint(chrome.runtime.connect() as Runtime.Port));

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
  private streamer = streamingSite(location.href);
  declare context: React.ContextType<typeof I18nContext>;
  private divRef: React.RefObject<HTMLDivElement>;
  private currentTime: number = 0;
  private lastHref: string = location.href;
  constructor(props: TranscrobesLayerPlayerProps | Readonly<TranscrobesLayerPlayerProps>) {
    super(props);
    this.divRef = React.createRef<HTMLDivElement>();
  }
  player: HTMLVideoElement;

  async componentDidMount() {
    // We should never actually attempt to mount if we aren't supported...
    if (this.streamer) {
      let i = 0;
      let ply: HTMLVideoElement | undefined = undefined;
      while (!ply && i < 50) {
        ply = getStreamerVideoElement(document, this.streamer);
        if (!ply) {
          console.log("Waiting for video element to appear...", i);
          await new Promise((res) => setTimeout(res, 500));
          i++;
        }
      }
      if (ply) this.player = ply;
    }
    this.addListeners(this.player);
    this.props.onMount && this.props.onMount(this);
    console.log("Found player", this.props.onMount, this.player?.readyState, this.player);
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
      console.log("Set up player", this.player, url, isReady);
    } else {
      console.log("Ran load without a player", url, isReady);
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
    if (this.streamer === "netflix") {
      proxy.seekNetflix({ value: seconds });
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

    if (location.href !== this.lastHref) {
      console.debug("Changed url, reloading", location.href, this.lastHref);
      location.reload();
    }
    if (this.props.playing && this.player.currentTime === this.currentTime) {
      if (!store.getState().ui.loading) {
        store.dispatch(setLoading(true));
        store.dispatch(setLoadingMessage(this.context.translate("screens.extension.streamer.buffering")));
      } else if (this.streamer === "netflix") {
        // FIXME: previously a player.play() would restart but now some other magic is happening, so we need to
        // reload the page. The transcrobing should now be autorestarted, so should only be of very minor inconvenience.

        proxy.getNetflixPlayerError().then((result) => {
          /*
            display : {code: 'D7500', text: undefined}
            messageIdList : ['pause_timeout', 'D7500']
            */
          if (result) {
            console.debug("Netflix player error", result);
            if (result?.display?.code === "D7500") {
              // pause_timeout
              window.location.reload();
            } // ??? maybe a reload here also for good measure?
          } else if (result === false) {
            // no player
            window.location.reload();
          } // else it should be null, which means no error
        });
      }
    } else if (this.player.currentTime !== this.currentTime) {
      if (store.getState().ui.loading) {
        store.dispatch(setLoading(undefined));
        store.dispatch(setLoadingMessage(undefined));
      }
      this.currentTime = this.player.currentTime;
    }

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

TranscrobesLayerPlayer.contextType = I18nContext;

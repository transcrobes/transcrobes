import { useState, useRef, ChangeEvent, useEffect } from "react";
import Grid from "@material-ui/core/Grid";
import { ValueLabelProps } from "@material-ui/core/Slider";
import Container from "@material-ui/core/Container";
import { makeStyles, Theme } from "@material-ui/core/styles";
import ReactPlayer from "react-player";
import useEventListener from "@use-it/event-listener";

import VideoBottomControls from "./VideoBottomControls";
import SubtitleControl from "./SubtitleControl";
import VideoCentralControls from "./VideoCentralControls";
import VideoHeaderControls from "./VideoHeaderControls";
import PrettoSlider, { ValueLabelComponent } from "./PrettoSlider";
import { SubPosition, VideoConfig, VideoContentConfig } from "./types";
import {
  defineElements,
  setGlossing,
  setGlossColour,
  setGlossFontSize,
  setOnScreenDelayIsConsideredRead,
  setPlatformHelper,
  setSegmentation,
  setLangPair,
  setPopupParent,
  clearGlossStyle,
} from "../../lib/components";
import { setGlossPosition, setMouseover, USER_STATS_MODE } from "../../lib/lib";
import { HslColor } from "react-colorful";
import useFullscreen from "../../hooks/useFullscreen";
import useWindowDimensions from "../../hooks/WindowDimensions";
import { overrideTextTrackListeners } from "../../lib/eventlisteners";
import { hslToHex } from "../../lib/funclib";
import { GlossPosition } from "../../lib/types";

overrideTextTrackListeners();

let count = 0;
let configCount = 0;
let timeoutId = 0;

// FIXME: don't hardcode here
const TIMER_CLEAR_PREVIOUS_MS = 5000;
const SEEK_SECONDS = 5;

const useStyles = makeStyles((theme: Theme) => ({
  playerContainer: {
    overflow: "auto",
  },
  playerWrapper: {
    width: "100%",
    position: "relative",
    [theme.breakpoints.down("sm").toString() + " and (display-mode: !fullscreen)"]: {
      margin: `${theme.spacing(1)}px 0`,
    },
    [theme.breakpoints.up("sm").toString() + " and (display-mode: !fullscreen)"]: {
      margin: `${theme.spacing(2)}px 0`,
    },
  },
  controlsWrapper: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: "rgba(0,0,0,0.4)",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
  },
  topControls: {
    [theme.breakpoints.down("sm")]: {
      padding: theme.spacing(1),
    },
    [theme.breakpoints.up("sm")]: {
      padding: theme.spacing(2),
    },
  },
  topControlsText: {
    color: "#fff",
  },
  middleControls: {
    [theme.breakpoints.down("sm")]: {
      padding: `0 ${theme.spacing(1)}px ${theme.spacing(1)}px`,
    },
    [theme.breakpoints.up("sm")]: {
      padding: theme.spacing(2),
    },
  },
  bottomWrapper: {
    display: "flex",
    flexDirection: "column",
    [theme.breakpoints.down("sm")]: {
      padding: theme.spacing(1),
    },
    [theme.breakpoints.up("sm")]: {
      padding: theme.spacing(2),
    },
  },
  bottomControls: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  button: {
    margin: theme.spacing(1),
  },
  controlIcons: {
    color: "#777",
    [theme.breakpoints.down("sm")]: {
      fontSize: 15,
    },
    [theme.breakpoints.up("sm")]: {
      fontSize: 50,
    },
    transform: "scale(0.9)",
    "&:hover": {
      color: theme.palette.getContrastText(theme.palette.background.default),
      transform: "scale(1)",
    },
  },
  fineControlIcons: {
    color: "#777",
    fontSize: 20,
    transform: "scale(0.9)",
    "&:hover": {
      color: theme.palette.getContrastText(theme.palette.background.default),
      transform: "scale(1)",
    },
  },
  select: {
    justifyContent: "center",
    color: "#777",
    [theme.breakpoints.down("sm")]: {
      fontSize: 15,
    },
    [theme.breakpoints.up("sm")]: {
      fontSize: 30,
    },
    transform: "scale(0.9)",
    "&:hover": {
      color: theme.palette.getContrastText(theme.palette.background.default),
      transform: "scale(1)",
    },
  },
  switch: {
    justifyContent: "center",
    color: "#777",
    [theme.breakpoints.down("sm")]: {
      fontSize: 15,
    },
    [theme.breakpoints.up("sm")]: {
      fontSize: 30,
    },
    transform: "scale(0.9)",
    "&:hover": {
      color: theme.palette.getContrastText(theme.palette.background.default),
      transform: "scale(1)",
    },
  },
  bottomIcons: {
    color: "#999",
    "&:hover": {
      color: theme.palette.getContrastText(theme.palette.background.default),
    },
    [theme.breakpoints.down("sm")]: {
      "& svg": {
        fontSize: 15,
      },
    },
    [theme.breakpoints.up("sm")]: {
      "& svg": {
        fontSize: 30,
      },
    },
  },
  volumeSlider: {
    width: 100,
  },
}));

function format(seconds: number) {
  if (isNaN(seconds)) {
    return `00:00`;
  }
  const date = new Date(seconds * 1000);
  const hh = date.getUTCHours();
  const mm = date.getUTCMinutes();
  const ss = date.getUTCSeconds().toString().padStart(2, "0");
  if (hh) {
    return `${hh}:${mm.toString().padStart(2, "0")}:${ss}`;
  }
  return `${mm}:${ss}`;
}

interface Props {
  subsUrl: string;
  videoUrl: string;
  contentConfig: VideoContentConfig | null;
  contentLabel?: string;
  srcLang?: string;
  onContentConfigUpdate: (contentConfig: VideoContentConfig) => void;
}

function VideoPlayer({
  subsUrl,
  videoUrl,
  contentLabel,
  srcLang,
  contentConfig,
  onContentConfigUpdate,
}: Props): JSX.Element {
  const classes = useStyles();
  const DEFAULT_FONT_COLOUR = { h: 0, s: 0, l: 100 };

  const [subPosition, setSubPosition] = useState<SubPosition>("bottom");

  const playerRef = useRef<ReactPlayer>(null);
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const [timeDisplayFormat, setTimeDisplayFormat] = useState<"remaining" | "normal">("normal");
  const [playing, setPlaying] = useState(true);
  const [muted, setMuted] = useState(false);
  const [seeking, setSeeking] = useState(false);
  const [currentCue, setCurrentCue] = useState("");
  const [track, setTrack] = useState<TextTrack | null>(null);
  const [controlsVisibility, setControlsVisibility] = useState<"hidden" | "visible">("visible");
  const [volume, setVolume] = useState(1);
  const [currentPlaybackRate, setCurrentPlaybackRate] = useState(1.0);
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [subPlaybackRate, setSubPlaybackRate] = useState(1.0);
  const [played, setPlayed] = useState(0);
  const [subDelay, setSubDelay] = useState(0);
  const [subFontSize, setSubFontSize] = useState(1);
  const [subFontColour, setSubFontColour] = useState<HslColor>(DEFAULT_FONT_COLOUR);
  const [glossFontSize, setLocalGlossFontSize] = useState(1);
  const [glossFontColour, setGlossFontColour] = useState<HslColor>(DEFAULT_FONT_COLOUR);
  const [glossPosition, setLocalGlossPosition] = useState<GlossPosition>("row");
  const [subBoxWidth, setSubBoxWidth] = useState(0.8); // 80% of the screen
  const [glossing, setLocalGlossing] = useState(USER_STATS_MODE.L1);
  const [segmentation, setLocalSegmentation] = useState(true);
  const [mouseover, setLocalMouseover] = useState(true);

  const [isFullscreen, toggleFullscreen] = useFullscreen();

  function updateGlossing(newGlossing: number) {
    if (contentConfig?.config) {
      setLocalGlossing(newGlossing);
    }
    setGlossing(newGlossing);
  }
  function updateGlossFontColour(newFontColour: HslColor) {
    if (contentConfig?.config) {
      setGlossFontColour(newFontColour);
    }
    clearGlossStyle(window.document);
    setGlossColour(hslToHex(newFontColour));
  }

  function updateGlossFontSize(newFontSize: number) {
    if (contentConfig?.config) {
      setLocalGlossFontSize(newFontSize);
    }
    clearGlossStyle(window.document);
    setGlossFontSize(newFontSize * 100);
  }

  function updateGlossPosition(position: GlossPosition) {
    if (contentConfig?.config) {
      setLocalGlossPosition(position);
    }
    clearGlossStyle(window.document);
    setGlossPosition(position);
  }

  function updateSegmentation(_event: any, newSegmentation: boolean) {
    if (contentConfig?.config) {
      setLocalSegmentation(newSegmentation);
    }
    setSegmentation(newSegmentation);
  }

  function updateMouseover(_event: any, newMouseover: boolean) {
    if (contentConfig?.config) {
      setLocalMouseover(newMouseover);
    }
    setMouseover(newMouseover);
  }

  useEffect(() => {
    if (contentConfig?.config) {
      setVolume(contentConfig.config.volume);
      setPlaybackRate(contentConfig.config.playbackRate || 1.0);
      setCurrentPlaybackRate(contentConfig.config.playbackRate || 1.0);
      setSubPlaybackRate(contentConfig.config.subPlaybackRate || 1.0);
      setPlayed(contentConfig.config.played);
      setSubDelay(contentConfig.config.subDelay);
      setSubFontSize(contentConfig.config.subFontSize);
      setSubBoxWidth(contentConfig.config.subBoxWidth);
      setSubFontColour(contentConfig.config.subFontColour);
      setSubPosition(contentConfig.config.subPosition);
    }
    // set up components
    // FIXME: do increase audio above 100%!
    // if (!audioCtx) {
    //   audioCtx = new AudioContext();
    //   source = audioCtx.createMediaElementSource(video);
    //   gainNode = audioCtx.createGain();
    //   gainNode.gain.value = parameters.volumeValue;
    //   source.connect(gainNode);
    //   gainNode.connect(audioCtx.destination);
    // }
    const ONSCREEN_DELAY_IS_CONSIDERED_READ = 1000; // milliseconds

    // const SAVE_CONFIG_TO_LOCAL_EVERY = 5000; // milliseconds
    // const DATA_SOURCE = "media-js";
    // components.setEventSource(DATA_SOURCE);
    const platformHelper = window.componentsConfig.proxy;

    updateGlossing(contentConfig?.config?.glossing || USER_STATS_MODE.L1);
    updateGlossFontSize(contentConfig?.config?.glossFontSize || 1);
    updateGlossFontColour(contentConfig?.config?.glossFontColour || DEFAULT_FONT_COLOUR);
    updateGlossPosition(contentConfig?.config?.glossPosition || "row");
    updateSegmentation(null, contentConfig?.config?.segmentation === false ? false : true);
    updateMouseover(null, contentConfig?.config?.mouseover === false ? false : true);
    // FIXME: this is broken...
    setLangPair(window.componentsConfig.langPair);

    setPlatformHelper(platformHelper);
    defineElements();

    if (playerContainerRef.current) {
      setPopupParent(playerContainerRef.current);
    }
    setOnScreenDelayIsConsideredRead(ONSCREEN_DELAY_IS_CONSIDERED_READ);
  }, []);

  useEffect(() => {
    if (contentConfig && configCount > 2) {
      configCount = 0;
      const conf: VideoConfig = {
        volume,
        played,
        playbackRate,
        subPlaybackRate,
        subDelay,
        subFontSize,
        subBoxWidth,
        subFontColour,
        glossFontColour,
        glossFontSize,
        glossPosition,
        subPosition,
        glossing,
        segmentation,
        mouseover,
      };
      onContentConfigUpdate({
        id: contentConfig.id,
        config: conf,
      });
    }
  }, [
    volume,
    played,
    playbackRate,
    subPlaybackRate,
    subDelay,
    subFontColour,
    subFontSize,
    glossFontColour,
    glossFontSize,
    subBoxWidth,
    glossing,
    segmentation,
    mouseover,
  ]);
  useEffect(() => {
    const htmlTrack = playerContainerRef.current?.querySelector("track");
    const textTrack = htmlTrack?.track;
    if (textTrack) {
      textTrack.clearEventListeners("cuechange");
      readContent(textTrack);
    }
  }, [playbackRate, subPlaybackRate]);

  function shiftSubs(delay: number): void {
    if (track && track.cues) {
      Array.from(track.cues).forEach((cue) => {
        cue.startTime += delay;
        cue.endTime += delay;
      });
      setSubDelay(subDelay + delay);
    }
  }

  function skipBack() {
    playerRef?.current?.seekTo(playerRef.current.getCurrentTime() - SEEK_SECONDS);
  }

  function skipForward() {
    playerRef?.current?.seekTo(playerRef.current.getCurrentTime() + SEEK_SECONDS);
  }

  function stopPropagation(e: Event) {
    e.preventDefault();
    e.stopPropagation();
    return false;
  }
  useEventListener("click", () => {
    document.querySelectorAll("token-details").forEach((el) => el.remove());
  });

  useEventListener("keydown", (e: KeyboardEvent) => {
    let matched = true;
    if (e.key == "f") {
      toggleFullscreen(playerContainerRef?.current);
    } else if (e.key == " ") {
      // space bar, toggle pause
      setPlaying(!playing);
      // FIXME: is this necessary?
      // } else if (e.ctrlKey && e.shiftKey && e.key == "ArrowLeft") {
      //   setSubPlaybackRate(playbackRate - 0.05);
      // } else if (e.ctrlKey && e.shiftKey && e.key == "ArrowRight") {
      //   setSubPlaybackRate(playbackRate + 0.05);
    } else if (e.ctrlKey && e.shiftKey && e.key == "ArrowLeft") {
      setPlaybackRate(playbackRate - 0.05);
    } else if (e.ctrlKey && e.shiftKey && e.key == "ArrowRight") {
      setPlaybackRate(playbackRate + 0.05);
    } else if (e.shiftKey && e.key == "ArrowLeft") {
      shiftSubs(-0.5);
    } else if (e.shiftKey && e.key == "ArrowRight") {
      shiftSubs(0.5);
    } else if (e.ctrlKey && e.key == "ArrowLeft") {
      skipBack();
    } else if (e.ctrlKey && e.key == "ArrowRight") {
      skipForward();
    } else if (e.key == "ArrowLeft") {
      previousCue();
    } else if (e.key == "ArrowRight") {
      nextCue();
    } else {
      matched = false;
    }
    if (matched) {
      return stopPropagation(e);
    } else {
      return true;
    }
  });

  function doCueChange(e: Event): void {
    const cues = (e?.currentTarget as TextTrack).activeCues;
    if (cues && cues[0] !== undefined) {
      clearTimeout(timeoutId);
      setCurrentCue((cues[0] as VTTCue).text);
      setCurrentPlaybackRate(subPlaybackRate);
    } else {
      // keep the subs until they get replaced or TIMER_CLEAR_PREVIOUS_MS after they would have been removed
      const mto = window.setTimeout(() => {
        if ((() => playing)()) {
          setCurrentCue("");
          setCurrentPlaybackRate(playbackRate);
        }
      }, TIMER_CLEAR_PREVIOUS_MS);
      timeoutId = mto;
    }
    return;
  }

  function handleProgress(changeState: {
    played: number;
    playedSeconds: number;
    loaded: number;
    loadedSeconds: number;
  }): void {
    configCount += 1;
    if (count > 2) {
      setControlsVisibility("hidden");
      count = 0;
    }
    if (controlsVisibility === "visible") {
      count += 1;
    }
    if (!seeking) {
      setPlayed(changeState.played);
    }
  }

  function readContent(track: TextTrack) {
    if (track.oncuechange) return;

    track.addEventListener("cuechange", doCueChange, true);
  }

  function handleReady() {
    const htmlTrack = playerContainerRef.current?.querySelector("track");
    const textTrack = htmlTrack?.track;
    if (textTrack && !track) {
      setTrack(textTrack);
      textTrack.mode = "hidden";
      if (htmlTrack?.readyState === 2) {
        readContent(textTrack);
        if (subDelay !== 0) {
          if (textTrack.cues) {
            Array.from(textTrack.cues).forEach((cue) => {
              cue.startTime += subDelay;
              cue.endTime += subDelay;
            });
          }
        }
      } else {
        htmlTrack.addEventListener("load", () => {
          readContent(textTrack);
          if (subDelay !== 0) {
            if (textTrack.cues) {
              Array.from(textTrack.cues).forEach((cue) => {
                cue.startTime += subDelay;
                cue.endTime += subDelay;
              });
            }
          }
        });
      }
      if (played > 0) playerRef?.current?.seekTo(played, "fraction");
    }
  }

  // eslint-disable-next-line @typescript-eslint/ban-types
  function handleSeekMouseUp(_e: ChangeEvent<{}>, value: number | number[]): void {
    const newValue = Array.isArray(value) ? value[0] : value;
    setSeeking(false);
    playerRef?.current?.seekTo(newValue / 100, "fraction");
  }

  // eslint-disable-next-line @typescript-eslint/ban-types
  function handleVolumeSeekDown(_event: ChangeEvent<{}>, value: number | number[]): void {
    const newValue = Array.isArray(value) ? value[0] : value;
    setSeeking(false);
    setVolume(newValue / 100);
  }
  // eslint-disable-next-line @typescript-eslint/ban-types
  function handleVolumeChange(_event: ChangeEvent<{}>, value: number | number[]): void {
    const newValue = Array.isArray(value) ? value[0] : value;
    setVolume(newValue / 100);
    setMuted(newValue === 0 ? true : false);
  }

  function handleMouseMove(): void {
    setControlsVisibility("visible");
    count = 0;
  }

  function handleMouseLeave(): void {
    setControlsVisibility("hidden");
    count = 0;
  }

  function previousCue(): boolean {
    if (!track?.cues || !playerRef?.current) return false;

    const cues = Array.from(track.cues);
    let low = 0;
    let high = cues.length;
    while (low < high) {
      const mid = ((low + high) / 2) | 0;
      if (playerRef.current.getCurrentTime() > cues[mid].startTime) {
        low = mid + 1;
      } else {
        high = mid;
      }
    }
    low = low - 1 > 0 ? low - 1 : 0;
    const previousStart = cues[low].startTime;
    if (playerRef.current.getCurrentTime() - previousStart < 2) {
      playerRef.current.seekTo(low > 0 ? cues[low - 1].startTime : cues[0].startTime);
    } else {
      playerRef.current.seekTo(previousStart);
    }
    return true;
  }

  function nextCue(): boolean {
    if (!track?.cues || !playerRef?.current) return false;

    const cues = Array.from(track.cues);
    let low = 0;
    let high = cues.length;
    while (low < high) {
      const mid = ((low + high) / 2) | 0;
      if (playerRef.current.getCurrentTime() < cues[mid].startTime) {
        high = mid;
      } else {
        low = mid + 1;
      }
    }
    playerRef.current.seekTo(cues[low].startTime);
    return true;
  }

  const currentTime = playerRef && playerRef.current ? playerRef.current.getCurrentTime() : 0;
  const duration = playerRef && playerRef.current ? playerRef.current.getDuration() : 0;
  const elapsedTime =
    timeDisplayFormat == "normal" ? format(currentTime) : `-${format(duration - currentTime)}`;
  const totalDuration = format(duration);
  const dimensions = useWindowDimensions();

  return (
    <>
      <Container>
        <div ref={playerContainerRef} className={classes.playerContainer}>
          <div
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            className={classes.playerWrapper}
          >
            {/* {subsPosition === "above" && (
              <Grid container direction="row" alignItems="center" justifyContent="center">
                <SubtitleControl classes={{ color: "#fff" }} currentCue={currentCue} />
              </Grid>
            )} */}

            <ReactPlayer
              ref={playerRef}
              width="100%"
              height="100%"
              url={videoUrl}
              playing={playing}
              controls={false}
              playbackRate={currentPlaybackRate}
              volume={volume}
              muted={muted}
              onProgress={handleProgress}
              progressInterval={2000}
              onReady={handleReady}
              config={{
                file: {
                  attributes: {
                    crossOrigin: "anonymous",
                  },
                  tracks: [
                    {
                      kind: "subtitles",
                      src: subsUrl,
                      default: true,
                      label: contentLabel || "",
                      srcLang: srcLang || "",
                    },
                  ],
                },
              }}
            />
            <div className={classes.controlsWrapper}>
              <Grid
                container
                direction="column"
                justifyContent={
                  controlsVisibility === "hidden" && subPosition === "bottom"
                    ? "flex-end"
                    : "space-between"
                }
                style={{ flexGrow: 1 }}
              >
                {subPosition === "top" && currentCue && (
                  <Grid container direction="row" alignItems="center" justifyContent="center">
                    <SubtitleControl
                      subBoxWidth={subBoxWidth}
                      subFontColour={subFontColour}
                      subFontSize={subFontSize}
                      classes={classes}
                      currentCue={currentCue}
                    />
                  </Grid>
                )}

                {controlsVisibility === "visible" && (
                  <>
                    {dimensions.width > 600 && (
                      <VideoHeaderControls title={contentLabel || ""} classes={classes} />
                    )}
                    <VideoCentralControls
                      classes={classes}
                      onSkipNextCue={nextCue}
                      onSkipPreviousCue={previousCue}
                      onFastForward={skipForward}
                      onRewind={skipBack}
                      onPlayPause={() => setPlaying(!playing)}
                      playing={playing}
                    />
                  </>
                )}
                <Grid
                  container
                  direction="row"
                  justifyContent="space-between"
                  alignItems="center"
                  className={classes.middleControls}
                >
                  {subPosition === "bottom" && currentCue && (
                    <Grid item xs={12}>
                      <Grid container direction="row" alignItems="flex-end" justifyContent="center">
                        <SubtitleControl
                          subBoxWidth={subBoxWidth}
                          subFontColour={subFontColour}
                          subFontSize={subFontSize}
                          classes={classes}
                          currentCue={currentCue}
                        />
                      </Grid>
                    </Grid>
                  )}
                  {controlsVisibility === "visible" && (
                    <Grid item xs={12}>
                      <PrettoSlider
                        min={0}
                        max={100}
                        ValueLabelComponent={(props: ValueLabelProps) => (
                          <ValueLabelComponent {...props} value={parseFloat(elapsedTime)} />
                        )}
                        value={played * 100}
                        onChange={(_e: any, newValue: any) =>
                          setPlayed(Array.isArray(newValue) ? newValue[0] : newValue / 100)
                        }
                        onMouseDown={() => setSeeking(true)}
                        onChangeCommitted={handleSeekMouseUp}
                      />
                    </Grid>
                  )}
                  {controlsVisibility === "visible" && (
                    <VideoBottomControls
                      containerRef={playerContainerRef}
                      isFullscreen={isFullscreen}
                      classes={classes}
                      playing={playing}
                      onContentConfigUpdate={onContentConfigUpdate}
                      onFastForward={skipForward}
                      onPlayPause={() => setPlaying(!playing)}
                      onRewind={skipBack}
                      elapsedTime={elapsedTime}
                      totalDuration={totalDuration}
                      muted={muted}
                      playbackRate={playbackRate}
                      subPlaybackRate={subPlaybackRate}
                      volume={volume}
                      subDelay={subDelay}
                      subFontSize={subFontSize}
                      subBoxWidth={subBoxWidth}
                      subFontColour={subFontColour}
                      subPosition={subPosition}
                      glossing={glossing}
                      segmentation={segmentation}
                      mouseover={mouseover}
                      glossFontColour={glossFontColour}
                      glossFontSize={glossFontSize}
                      glossPosition={glossPosition}
                      onSubPositionChange={(position) => setSubPosition(position)}
                      onSubFontSizeChange={(size) => setSubFontSize(size)}
                      onSubFontColourChange={(colour) => setSubFontColour(colour)}
                      onGlossFontSizeChange={updateGlossFontSize}
                      onGlossFontColourChange={updateGlossFontColour}
                      onGlossPositionChange={updateGlossPosition}
                      onSubBoxWidthChange={(width) => setSubBoxWidth(width)}
                      onSubDelayChange={(delay) => shiftSubs(delay)}
                      onSeekMouseDown={() => setSeeking(true)}
                      onMute={() => setMuted(!muted)}
                      onVolumeSeekDown={handleVolumeSeekDown}
                      onChangeDisplayFormat={() =>
                        setTimeDisplayFormat(timeDisplayFormat == "normal" ? "remaining" : "normal")
                      }
                      onSubPlaybackRateChange={(rate) => {
                        setSubPlaybackRate(rate);
                      }}
                      onPlaybackRateChange={(rate) => {
                        setPlaybackRate(rate);
                      }}
                      onToggleFullscreen={() => {
                        toggleFullscreen(playerContainerRef?.current);
                      }}
                      onVolumeChange={handleVolumeChange}
                      onGlossingChange={updateGlossing}
                      onSegmentationChange={updateSegmentation}
                      onMouseoverChange={updateMouseover}
                    />
                  )}
                </Grid>
              </Grid>
            </div>
          </div>
          {subPosition === "under" && currentCue && (
            <Grid container direction="row" alignItems="center" justifyContent="center">
              <SubtitleControl
                subBoxWidth={subBoxWidth}
                subFontColour={subFontColour}
                subFontSize={subFontSize}
                classes={classes}
                currentCue={currentCue}
              />
            </Grid>
          )}
        </div>
      </Container>
    </>
  );
}

export default VideoPlayer;

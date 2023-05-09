import { Box, Container, Grid } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import useEventListener from "@use-it/event-listener";
import { forwardRef, ReactElement, useEffect, useImperativeHandle, useRef, useState } from "react";
import ReactPlayer from "react-player";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import Mouseover from "../../components/content/td/Mouseover";
import TokenDetails from "../../components/content/td/TokenDetails";
import { videoReaderActions } from "../../features/content/videoReaderSlice";
import useFullscreen from "../../hooks/useFullscreen";
import useWindowDimensions from "../../hooks/WindowDimensions";
import { overrideTextTrackListeners } from "../../lib/eventlisteners";
import { DEFAULT_VIDEO_READER_CONFIG_STATE, KeyedModels } from "../../lib/types";
import PrettoSlider, { ValueLabelComponent } from "./PrettoSlider";
import SubtitleControl from "./SubtitleControl";
import TranscrobesLayerPlayer from "../../extension/TranscrobesLayerPlayer";
import VideoBottomControls from "./VideoBottomControls";
import VideoCentralControls from "./VideoCentralControls";
import VideoHeaderControls from "./VideoHeaderControls";
import { Cue } from "webvtt-parser";

ReactPlayer.addCustomPlayer(TranscrobesLayerPlayer as any); // FIXME: the upstream typing is wrong here
overrideTextTrackListeners();

let count = 0;
let timeoutId = 0;

// FIXME: don't hardcode here
const TIMER_CLEAR_PREVIOUS_MS = 5000;
const SEEK_SECONDS = 5;

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
  id: string;
  topToolbar?: ReactElement;
  models: KeyedModels;
  subsUrl?: string;
  cues?: Cue[];
  videoUrl: string;
  contentLabel?: string;
  srcLang?: string;
  ref: React.RefObject<ReactElement>;
}

export type VideoPlayerHandle = {
  shiftSubs: (delay: number) => void;
};

export interface OnProgressProps {
  played: number;
  playedSeconds: number;
  loaded: number;
  loadedSeconds: number;
}

const VideoPlayer = forwardRef<VideoPlayerHandle, Props>(
  ({ cues, models, subsUrl, videoUrl, contentLabel, srcLang, id, topToolbar }, ref) => {
    const playerRef = useRef<ReactPlayer>(null);
    const playerContainerRef = useRef<HTMLDivElement>(null);
    const [playing, setPlaying] = useState(true);
    const [seeking, setSeeking] = useState(false);
    const [currentCue, setCurrentCue] = useState("");
    const [track, setTrack] = useState<TextTrack | null>(null);
    const [controlsVisibility, setControlsVisibility] = useState<"hidden" | "visible">("visible");
    const [currentPlaybackRate, setCurrentPlaybackRate] = useState(1.0);
    const dispatch = useAppDispatch();

    const readerConfig = useAppSelector((state) => state.videoReader[id] || DEFAULT_VIDEO_READER_CONFIG_STATE);

    useImperativeHandle(ref, () => ({
      shiftSubs(delay: number) {
        shiftSubs(delay);
      },
    }));
    useEffect(() => {
      // This emulates the FilePlayer url getting loaded and causes
      // our Transcrobifier player to get wired up properly and be "isReady"
      if (playerRef?.current?.getInternalPlayer()) {
        playerRef.current.getInternalPlayer().dispatchEvent(new Event("canplay"));
      }
    }, [playerRef?.current]);

    const [isFullscreen, toggleFullscreen] = useFullscreen();
    useEffect(() => {
      setCurrentPlaybackRate(readerConfig.playbackRate || 1.0);
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
    }, []);

    useEffect(() => {
      const htmlTrack = (
        (playerRef.current?.getInternalPlayer() as HTMLVideoElement) || playerContainerRef.current
      )?.querySelector("track");
      const textTrack = htmlTrack?.track || (playerRef.current?.getInternalPlayer()?.textTracks[0] as TextTrack);
      if (textTrack) {
        textTrack.oncuechange = null;
        readContent(textTrack);
      }
    }, [readerConfig.playbackRate, readerConfig.subPlaybackRate]);

    function shiftSubs(delay: number): void {
      if (track && track.cues) {
        Array.from(track.cues).forEach((cue) => {
          cue.startTime += delay;
          cue.endTime += delay;
        });
        dispatch(videoReaderActions.setDelay({ id, value: readerConfig.subDelay + delay }));
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
        dispatch(videoReaderActions.setPlaybackRate({ id, value: readerConfig.playbackRate - 0.05 }));
      } else if (e.ctrlKey && e.shiftKey && e.key == "ArrowRight") {
        dispatch(videoReaderActions.setPlaybackRate({ id, value: readerConfig.playbackRate + 0.05 }));
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
      if (cues?.[0]) {
        clearTimeout(timeoutId);
        setCurrentCue((cues[0] as VTTCue).text);
        setCurrentPlaybackRate(readerConfig.subPlaybackRate);
      } else {
        // keep the subs until they get replaced or TIMER_CLEAR_PREVIOUS_MS after they would have been removed
        timeoutId = window.setTimeout(() => {
          if ((() => playing)()) {
            setCurrentCue("");
            setCurrentPlaybackRate(readerConfig.playbackRate);
          }
        }, TIMER_CLEAR_PREVIOUS_MS);
      }
      return;
    }

    function handleProgress(changeState: {
      played: number;
      playedSeconds: number;
      loaded: number;
      loadedSeconds: number;
    }): void {
      if (count > 10) {
        setControlsVisibility("hidden");
        count = 0;
      }
      if (controlsVisibility === "visible") {
        count += 1;
      }
      if (!seeking) {
        // FIXME: this could be bad here!!!
        dispatch(videoReaderActions.setPlayed({ id, value: changeState.played }));
      }
    }

    function readContent(track: TextTrack) {
      if (track.oncuechange) return;
      track.oncuechange = doCueChange;
    }

    function handleReady() {
      const htmlTrack = (
        (playerRef.current?.getInternalPlayer() as HTMLVideoElement) || playerContainerRef.current
      )?.querySelector("track");
      const textTrack = htmlTrack?.track || (playerRef.current?.getInternalPlayer()?.textTracks[0] as TextTrack);
      if (textTrack && !track) {
        setTrack(textTrack);
        textTrack.mode = "hidden";
        if (!htmlTrack || htmlTrack.readyState === 2) {
          readContent(textTrack);
          if (readerConfig.subDelay !== 0) {
            if (textTrack.cues) {
              Array.from(textTrack.cues).forEach((cue) => {
                cue.startTime += readerConfig.subDelay;
                cue.endTime += readerConfig.subDelay;
              });
            }
          }
        } else {
          htmlTrack?.addEventListener("load", () => {
            readContent(textTrack);
            if (readerConfig.subDelay !== 0) {
              if (textTrack.cues && textTrack.cues.length > 0) {
                Array.from(textTrack.cues).forEach((cue) => {
                  cue.startTime += readerConfig.subDelay;
                  cue.endTime += readerConfig.subDelay;
                });
              }
            }
          });
        }
        if (readerConfig.played > 0) playerRef?.current?.seekTo(readerConfig.played, "fraction");
      }
    }
    function handleSeekMouseUp(_e: Event | React.SyntheticEvent<Element, Event>, value: number | number[]): void {
      const newValue = Array.isArray(value) ? value[0] : value;
      setSeeking(false);
      playerRef?.current?.seekTo(newValue / 100, "fraction");
    }

    function handleVolumeSeekDown(
      _event: Event | React.SyntheticEvent<Element, Event>,
      value: number | number[],
    ): void {
      const newValue = Array.isArray(value) ? value[0] : value;
      setSeeking(false);
      dispatch(videoReaderActions.setVolume({ id, value: newValue / 100 }));
    }
    function handleVolumeChange(_event: Event, value: number | number[]): void {
      const newValue = Array.isArray(value) ? value[0] : value;
      dispatch(videoReaderActions.setVolume({ id, value: newValue / 100 }));
      dispatch(videoReaderActions.setMuted({ id, value: newValue === 0 ? true : false }));
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
      readerConfig.timeDisplayFormat == "normal" ? format(currentTime) : `-${format(duration - currentTime)}`;
    const totalDuration = format(duration);
    const dimensions = useWindowDimensions();
    const theme = useTheme();
    return (
      <>
        <Container sx={{ padding: 0 }}>
          <Box ref={playerContainerRef} sx={{ overflow: "hidden" }}>
            <Box
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
              sx={{
                width: "100%",
                // FIXME: hack to decide whether we are in TC or not - topToolbar is only when used as extension
                position: topToolbar ? undefined : "relative",
                [theme.breakpoints.down("md").toString() + " and (display-mode: !fullscreen)"]: {
                  margin: `${theme.spacing(1)} 0`,
                },
                [theme.breakpoints.up("sm").toString() + " and (display-mode: !fullscreen)"]: {
                  margin: `${theme.spacing(2)} 0`,
                },
              }}
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
                volume={readerConfig.volume}
                muted={readerConfig.muted}
                onProgress={handleProgress}
                progressInterval={500}
                onReady={handleReady}
                config={{
                  // @ts-ignore
                  transcrobesLayer: { cues },
                  file: {
                    attributes: {
                      crossOrigin: "anonymous",
                    },
                    tracks: [
                      {
                        kind: "subtitles",
                        src: subsUrl || "",
                        default: true,
                        label: contentLabel || "",
                        srcLang: srcLang || "",
                      },
                    ],
                  },
                }}
              />
              <Box
                sx={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: controlsVisibility === "visible" ? "rgba(0,0,0,0.4)" : undefined,
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                }}
              >
                <Grid
                  container
                  direction="column"
                  justifyContent={
                    controlsVisibility === "hidden" && readerConfig.subPosition === "bottom"
                      ? "flex-end"
                      : "space-between"
                  }
                  style={{ flexGrow: 1 }}
                >
                  {readerConfig.subPosition === "top" && currentCue && (
                    <Grid container direction="row" alignItems="center" justifyContent="center">
                      <SubtitleControl id={id} models={models} currentCue={currentCue} />
                    </Grid>
                  )}

                  {controlsVisibility === "visible" && topToolbar}
                  {controlsVisibility === "visible" && (
                    <>
                      {dimensions.width > 600 && <VideoHeaderControls title={contentLabel || ""} />}
                      <VideoCentralControls
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
                    sx={{
                      [theme.breakpoints.down("md")]: {
                        padding: `0 ${theme.spacing(1)} ${theme.spacing(1)}`,
                      },
                      [theme.breakpoints.up("sm")]: {
                        padding: theme.spacing(2),
                      },
                    }}
                  >
                    {readerConfig.subPosition === "bottom" && currentCue && (
                      <Grid
                        sx={{
                          position: readerConfig.subRaise !== 0 ? "relative" : undefined,
                          bottom: readerConfig.subRaise !== 0 ? `${readerConfig.subRaise}px` : undefined,
                        }}
                        item
                        xs={12}
                      >
                        <Grid container direction="row" alignItems="flex-end" justifyContent="center">
                          <SubtitleControl id={id} models={models} currentCue={currentCue} />
                        </Grid>
                      </Grid>
                    )}
                    {controlsVisibility === "visible" && (
                      <Grid item xs={12}>
                        <PrettoSlider
                          min={0}
                          max={100}
                          components={{
                            ValueLabel: ValueLabelComponent,
                          }}
                          value={readerConfig.played * 100}
                          onChange={(_e: any, newValue: any) => {
                            const newPlayed = Array.isArray(newValue) ? newValue[0] : newValue / 100;
                            dispatch(videoReaderActions.setPlayed({ id, value: newPlayed }));
                          }}
                          onMouseDown={() => setSeeking(true)}
                          onChangeCommitted={handleSeekMouseUp}
                        />
                      </Grid>
                    )}
                    {controlsVisibility === "visible" && (
                      <VideoBottomControls
                        id={id}
                        containerRef={playerContainerRef}
                        isFullscreen={isFullscreen}
                        playing={playing}
                        onFastForward={skipForward}
                        onPlayPause={() => setPlaying(!playing)}
                        onRewind={skipBack}
                        elapsedTime={elapsedTime}
                        totalDuration={totalDuration}
                        onSubDelayChange={(delay) => shiftSubs(delay)}
                        onSeekMouseDown={() => setSeeking(true)}
                        onVolumeSeekDown={handleVolumeSeekDown}
                        onToggleFullscreen={() => {
                          toggleFullscreen(playerContainerRef?.current);
                        }}
                        onVolumeChange={handleVolumeChange}
                      />
                    )}
                  </Grid>
                </Grid>
              </Box>
            </Box>
            {readerConfig.subPosition === "under" && currentCue && (
              <Grid container direction="row" alignItems="center" justifyContent="center">
                <SubtitleControl id={id} models={models} currentCue={currentCue} />
              </Grid>
            )}
            <TokenDetails readerConfig={readerConfig} />
            <Mouseover readerConfig={readerConfig} />
          </Box>
        </Container>
      </>
    );
  },
);

export default VideoPlayer;

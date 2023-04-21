import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { Box } from "@mui/material";
import { ReactElement, useCallback, useEffect, useRef, useState } from "react";
import { Button, TopToolbar, useTranslate } from "react-admin";
import { Cue, WebVTTParser } from "webvtt-parser";
import { store } from "../app/createStore";
import { useAppDispatch, useAppSelector } from "../app/hooks";
import HelpButton from "../components/HelpButton";
import Loading from "../components/Loading";
import WatchDemo from "../components/WatchDemo";
import VideoPlayer, { VideoPlayerHandle } from "../contents/moocrobes/VideoPlayer";
import VideoReaderConfigLauncher from "../contents/moocrobes/VideoReaderConfigLauncher";
import { getRefreshedState } from "../features/content/contentSlice";
import { videoReaderActions } from "../features/content/videoReaderSlice";
import { setLoading } from "../features/ui/uiSlice";
import useWindowDimensions from "../hooks/WindowDimensions";
import { getNetflixData } from "../lib/componentMethods";
import { ensureDefinitionsLoaded } from "../lib/dictionary";
import { getSubsURL, missingWordIdsFromModels, wordIdsFromModels } from "../lib/funclib";
import { streamingSite } from "../lib/libMethods";
import { AbstractWorkerProxy } from "../lib/proxies";
import {
  ContentProps,
  DEFAULT_VIDEO_READER_CONFIG_STATE,
  DOCS_DOMAIN,
  InputLanguage,
  KeyedModels,
  MOOCROBES_YT_VIDEO,
  SUBS_DATA_SUFFIX,
  StreamDetails,
  VideoReaderState,
} from "../lib/types";

export async function getStreamDetails(url: string, proxy: AbstractWorkerProxy, fromLang: InputLanguage) {
  const streamer = streamingSite(url);
  let data: StreamDetails | null | undefined = null;
  let error: string | undefined = undefined;
  let loops = 0;
  while (loops < 3 && !data) {
    switch (streamer) {
      case "netflix":
        ({ data, error } = await getNetflixData(proxy, fromLang, url));
        break;
      case "youku":
        ({ data } = await proxy.sendMessagePromise<{ data: StreamDetails }>({
          source: "vps",
          type: "getYoukuData",
        }));
        if (data.subtitles) {
          const promises =
            data.subtitles?.map(async (s) => {
              const resp = await fetch(s.url);
              if (resp.ok) {
                const content = await resp.text();
                return { url: s.url, lang: s.lang, content };
              }
              return { url: s.url, lang: s.lang, content: "" };
            }) || [];
          data.subtitles = await Promise.all(promises);
        } else {
          return { error: "screens.extension.streamer.no_available_subs" };
        }
        break;
    }
    if (data) {
      return { data };
    }
    if (error && ["screens.extension.streamer.bad_subs_lang"].includes(error)) {
      return { error };
    }
    loops++;
    await new Promise((res) => setTimeout(res, 5000)); // sleep
  }
  return { error };
}

export default function VideoPlayerScreen({ proxy }: ContentProps): ReactElement {
  const [models, setModels] = useState<KeyedModels>({});
  const [id, setId] = useState<string>("");
  // const [contentIds, setContentIds] = useState<string[]>();
  const [loadingMessage, setLoadingMessage] = useState<string>("screens.extension.streamer.looking_for_subs");
  const dispatch = useAppDispatch();
  const definitions = useAppSelector((state) => state.definitions);
  const [confLoaded, setConfLoaded] = useState(false);
  const [cues, setCues] = useState<Cue[]>([]);

  const dims = useWindowDimensions();
  const user = useAppSelector((state) => state.userData.user);
  const translate = useTranslate();

  const updateState = useCallback(async () => {
    if (id && cues.length === 0) {
      const [currentCueString, currentModels] = await Promise.all([
        proxy.sendMessagePromise<{ data?: string; error?: any }>({
          source: "Extension",
          type: "serverGet",
          value: { url: getSubsURL(id, true), isText: true },
        }),
        proxy.sendMessagePromise<{ data?: KeyedModels; error?: any }>({
          source: "Extension",
          type: "serverGet",
          value: { url: `${getSubsURL(id, true)}${SUBS_DATA_SUFFIX}` },
        }),
      ]);
      if (currentCueString?.data && currentModels?.data) {
        // the import and content creation have finished
        const parser = new WebVTTParser();
        const tree = parser.parse(currentCueString.data, "metadata");
        // force syncing down any new definitions
        await proxy.sendMessagePromise<string>({
          source: "Extension",
          type: "forceDefinitionsSync",
        });
        const uniqueIds = missingWordIdsFromModels(currentModels.data, definitions);
        setCues(tree.cues);
        setModels(currentModels.data);
        ensureDefinitionsLoaded(proxy, [...uniqueIds], store);
        store.dispatch(setLoading(false));
        setConfLoaded(true);
        return;
      }
      setTimeout(() => {
        updateState();
      }, 3000);
    }
  }, [id, cues]);

  useEffect(() => {
    if (id) updateState();
  }, [id]);

  useEffect(() => {
    (async () => {
      const { data, error } = await getStreamDetails(window.location.href, proxy, user.fromLang);
      console.log("got back from streamdetails", data, error);
      if (data) {
        setLoadingMessage("screens.extension.streamer.processing_subs");
        const contents = await proxy.sendMessagePromise<{ data: { content_ids?: string[] } }>({
          source: "Extension",
          type: "streamingTitleSearch",
          value: data,
        });
        console.log("got back from streamingTitleSearch", contents);
        if (contents?.data?.content_ids && contents.data.content_ids.length > 0) {
          // setContentIds(contents.data.content_ids);
          setId(contents.data.content_ids[0]);
        } else {
          setLoadingMessage("screens.extension.streamer.sub_content_error");
        }
      } else if (error) {
        setLoadingMessage(translate(error));
        setTimeout(() => location.reload(), 3000);
      }
    })();
  }, []);

  useEffect(() => {
    if (!proxy.loaded || !id) return;
    (async () => {
      const streamer = streamingSite(location.href);
      const defConfig = {
        ...DEFAULT_VIDEO_READER_CONFIG_STATE,
        fontSize: dims.width < 1000 ? 1.5 : dims.width < 1500 ? 2 : 2.6,
        subBackgroundBlur: streamer === "youku",
        subRaise: streamer !== "youku" ? 0 : dims.width < 1000 ? 100 : dims.width < 1500 ? 120 : 150,
      };

      const conf = await getRefreshedState<VideoReaderState>(proxy, defConfig, id);
      dispatch(videoReaderActions.setState({ id, value: conf }));
    })();
  }, [proxy.loaded, id]);

  const playerContainerRef = useRef<HTMLDivElement>(null);
  const helpUrl = `//${DOCS_DOMAIN}/page/software/learn/moocrobes/`;
  const vpHandle = useRef<VideoPlayerHandle>(null);
  return confLoaded && models && id && cues.length > 0 ? (
    <Box
      ref={playerContainerRef}
      sx={{
        zIndex: 3000,
        bgcolor: (theme) => theme.palette.background.default,
        top: 0,
        left: 0,
        position: "absolute",
        width: "100%",
        height: "100%",
        overflow: "hidden",
      }}
    >
      <VideoPlayer
        topToolbar={
          <TopToolbar
            sx={{
              justifyContent: "space-between",
              alignItems: "center",
              maxHeight: "64px",
            }}
          >
            <VideoReaderConfigLauncher
              id={id}
              containerRef={playerContainerRef}
              onSubDelayChange={(delay: number) => {
                if (vpHandle.current) {
                  vpHandle.current.shiftSubs(delay);
                }
              }}
            />
            <WatchDemo url={MOOCROBES_YT_VIDEO} />
            <Button
              onClick={() => location.reload()}
              sx={{ marginLeft: ".2em" }}
              children={<ArrowBackIcon />}
              variant="text"
              label={translate(`buttons.general.back_to_${streamingSite(location.href)}`)}
            />
            <HelpButton url={helpUrl} />
          </TopToolbar>
        }
        models={models}
        cues={cues}
        ref={vpHandle as any}
        videoUrl={location.href}
        id={id}
      />
    </Box>
  ) : (
    <Loading position="fixed" message={translate(loadingMessage)} show />
  );
}
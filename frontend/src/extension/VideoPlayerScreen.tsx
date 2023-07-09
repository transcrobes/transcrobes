import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { Box } from "@mui/material";
import { ReactElement, useCallback, useEffect, useRef, useState } from "react";
import { Button, TopToolbar, useTranslate } from "react-admin";
import { Cue, WebVTTParser } from "webvtt-parser";
import { store } from "../app/createStore";
import { useAppDispatch, useAppSelector } from "../app/hooks";
import HelpButton from "../components/HelpButton";
import WatchDemo from "../components/WatchDemo";
import VideoPlayer, { VideoPlayerHandle } from "../contents/moocrobes/VideoPlayer";
import VideoReaderConfigLauncher from "../contents/moocrobes/VideoReaderConfigLauncher";
import { getRefreshedState } from "../features/content/contentSlice";
import { videoReaderActions } from "../features/content/videoReaderSlice";
import { setLoading, setLoadingMessage } from "../features/ui/uiSlice";
import useWindowDimensions from "../hooks/WindowDimensions";
import { getNetflixData } from "../lib/componentMethods";
import { ensureDefinitionsLoaded } from "../lib/dictionary";
import { getSubsURL, missingWordIdsFromModels } from "../lib/funclib";
import { getDefaultLanguageDictionaries, streamingSite, streamContentIdCacheKey } from "../lib/libMethods";
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
  translationProviderOrder,
} from "../lib/types";
import { ModelCache } from "./modelsCache";

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
    console.log("Waiting before another attempt", loops);
    await new Promise((res) => setTimeout(res, 5000)); // sleep
  }
  return { error };
}

export default function VideoPlayerScreen({ proxy }: ContentProps): ReactElement {
  const [models, setModels] = useState<KeyedModels>({});
  const [id, setId] = useState<string>("");
  const dispatch = useAppDispatch();
  const definitions = useAppSelector((state) => state.definitions);
  const [confLoaded, setConfLoaded] = useState(false);
  const [cues, setCues] = useState<Cue[]>([]);

  const dims = useWindowDimensions();
  const user = useAppSelector((state) => state.userData.user);
  const translate = useTranslate();

  async function handleBack() {
    await proxy.sendMessagePromise({
      source: "Extension",
      type: "removeStreamAutoPlay",
      value: { url: window.location.href },
    });
    location.reload();
  }

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
        await proxy.sendMessagePromise({
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
      const cached = await proxy.sendMessagePromise<ModelCache | null>({
        source: "Extension",
        type: "getCacheValue",
        value: streamContentIdCacheKey(window.location.href),
      });
      if (cached?.value) {
        setId(cached?.value.split(":")[0]);
      } else {
        const { data, error } = await getStreamDetails(window.location.href, proxy, user.fromLang);
        console.debug("Got back from streamdetails", data, error);
        if (data) {
          store.dispatch(setLoadingMessage(translate("screens.extension.streamer.processing_subs")));
          const contents = await proxy.sendMessagePromise<{ data: { content_ids?: string[] } }>({
            source: "Extension",
            type: "streamingTitleSearch",
            value: data,
          });
          console.debug("Got back from streamingTitleSearch", contents);
          if (contents?.data?.content_ids && contents.data.content_ids.length > 0) {
            setId(contents.data.content_ids[0]);
          } else {
            store.dispatch(setLoadingMessage(translate("screens.extension.streamer.sub_content_error")));
          }
        } else if (error) {
          store.dispatch(setLoadingMessage(translate(error)));
          setTimeout(() => location.reload(), 3000);
        }
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
        subBoxWidth: 1,
        translationProviderOrder: translationProviderOrder(getDefaultLanguageDictionaries(user.fromLang)),
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
              onClick={handleBack}
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
    <></>
  );
}

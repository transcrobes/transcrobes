import { Container } from "@mui/material";
import Button from "@mui/material/Button";
import { ReactElement, useEffect, useRef, useState } from "react";
import { TopToolbar, useGetOne, useTranslate } from "react-admin";
import { useParams } from "react-router-dom";
import { store } from "../../app/createStore";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import HelpButton from "../../components/HelpButton";
import WatchDemo from "../../components/WatchDemo";
import { getRawState, getRefreshedState } from "../../features/content/contentSlice";
import { videoReaderActions } from "../../features/content/videoReaderSlice";
import useWindowDimensions from "../../hooks/WindowDimensions";
import { ensureDefinitionsLoaded } from "../../lib/dictionary";
import { getSubsURL, missingWordIdsFromModels } from "../../lib/funclib";
import { fetchPlus, getDefaultLanguageDictionaries } from "../../lib/libMethods";
import {
  Content,
  ContentParams,
  ContentProps,
  DEFAULT_VIDEO_READER_CONFIG_STATE,
  DOCS_DOMAIN,
  KeyedModels,
  MOOCROBES_YT_VIDEO,
  SUBS_DATA_SUFFIX,
  VIDEO_READER_TYPE,
  VideoReaderState,
  translationProviderOrder,
} from "../../lib/types";
import VideoPlayer, { VideoPlayerHandle } from "./VideoPlayer";
import VideoReaderConfigLauncher from "./VideoReaderConfigLauncher";
import ReactPlayer from "react-player";

export default function VideoPlayerScreen({ proxy }: ContentProps): ReactElement {
  const { id = "" } = useParams<ContentParams>();
  const [fileURL, setFileURL] = useState<string>("");
  const [models, setModels] = useState<KeyedModels>({});
  const { data: content } = useGetOne<Content>("contents", { id });
  const dispatch = useAppDispatch();
  const definitions = useAppSelector((state) => state.definitions);
  const user = useAppSelector((state) => state.userData.user);
  const translate = useTranslate();

  const dims = useWindowDimensions();

  function handleFileSelect(files: FileList | null): void {
    if (files && files.length > 0) {
      const url = URL.createObjectURL(files[0]);
      if (url) {
        setFileURL(url);
      }
    }
  }

  useEffect(() => {
    (async () => {
      const def = (await getRawState(proxy, VIDEO_READER_TYPE)) || {};
      const defConfig = {
        ...DEFAULT_VIDEO_READER_CONFIG_STATE,
        ...def,
        fontSize: def?.fontSize || (dims.width < 1000 ? 1.5 : dims.width < 1500 ? 2 : 2.6),
        translationProviderOrder: translationProviderOrder(getDefaultLanguageDictionaries(user.fromLang)),
      };
      const conf = await getRefreshedState<VideoReaderState>(proxy, defConfig, id);
      dispatch(videoReaderActions.setState({ id, value: conf }));
      const currentModels = await fetchPlus(`${getSubsURL(id)}${SUBS_DATA_SUFFIX}`);
      setModels(currentModels);
      const uniqueIds = missingWordIdsFromModels(currentModels, definitions);
      ensureDefinitionsLoaded(proxy, [...uniqueIds], store);
    })();
  }, []);

  const helpUrl = `//${DOCS_DOMAIN}/page/software/learn/moocrobes/`;
  const vpHandle = useRef<VideoPlayerHandle>(null);
  return (
    <>
      <TopToolbar
        sx={{
          justifyContent: "space-between",
          alignItems: "center",
          maxHeight: "64px",
        }}
      >
        <VideoReaderConfigLauncher
          id={id}
          onSubDelayChange={(delay: number) => {
            if (vpHandle.current) {
              vpHandle.current.shiftSubs(delay);
            }
          }}
        />

        <WatchDemo url={MOOCROBES_YT_VIDEO} />
        <HelpButton url={helpUrl} />
      </TopToolbar>
      {!fileURL ? (
        <Container sx={{ padding: "2em" }}>
          <label htmlFor="file-input">
            <Button variant="outlined" component="span">
              {translate("screens.moocrobes.load_video_file")}
            </Button>
          </label>
          <input
            id="file-input"
            type="file"
            accept="video/*"
            style={{ display: "none" }}
            onChange={(e) => handleFileSelect(e.target.files)}
          />
        </Container>
      ) : (
        <VideoPlayer
          ReactPlayer={ReactPlayer}
          id={id}
          models={models}
          ref={vpHandle as any}
          subsUrl={getSubsURL(id)}
          videoUrl={fileURL}
          contentLabel={content?.title}
          srcLang={content?.lang || ""}
        />
      )}
    </>
  );
}

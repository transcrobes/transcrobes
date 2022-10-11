import { Container } from "@mui/material";
import Button from "@mui/material/Button";
import { ReactElement, useEffect, useRef, useState } from "react";
import { TopToolbar, useGetOne, useTranslate } from "react-admin";
import { useParams } from "react-router-dom";
import { makeStyles } from "tss-react/mui";
import { store } from "../../app/createStore";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import HelpButton from "../../components/HelpButton";
import WatchDemo from "../../components/WatchDemo";
import { getRefreshedState } from "../../features/content/contentSlice";
import { videoReaderActions } from "../../features/content/videoReaderSlice";
import { ensureDefinitionsLoaded } from "../../lib/dictionary";
import { getSubsURL, missingWordIdsFromModels } from "../../lib/funclib";
import { fetchPlus } from "../../lib/libMethods";
import {
  Content,
  ContentParams,
  ContentProps,
  DEFAULT_VIDEO_READER_CONFIG_STATE,
  DOCS_DOMAIN,
  KeyedModels,
  MOOCROBES_YT_VIDEO,
  SUBS_DATA_SUFFIX,
  VideoReaderState,
} from "../../lib/types";
import VideoPlayer, { VideoPlayerHandle } from "./VideoPlayer";
import VideoReaderConfigLauncher from "./VideoReaderConfigLauncher";

const useStyles = makeStyles()({
  button: { padding: "2em" },
  input: { display: "none" },
  toolbar: {
    justifyContent: "space-between",
    alignItems: "center",
    maxHeight: "64px",
  },
});

export default function VideoPlayerScreen({ proxy }: ContentProps): ReactElement {
  const { id = "" } = useParams<ContentParams>();
  const [fileURL, setFileURL] = useState<string>("");
  const [models, setModels] = useState<KeyedModels>({});
  const { data: content } = useGetOne<Content>("contents", { id });
  const dispatch = useAppDispatch();
  const definitions = useAppSelector((state) => state.definitions);
  const translate = useTranslate();
  const { classes } = useStyles();

  function handleFileSelect(files: FileList | null): void {
    if (files && files.length > 0) {
      const url = URL.createObjectURL(files[0]);
      if (url) {
        setFileURL(url);
      }
    }
  }

  useEffect(() => {
    if (!proxy.loaded) return;
    (async () => {
      const conf = await getRefreshedState<VideoReaderState>(proxy, DEFAULT_VIDEO_READER_CONFIG_STATE, id);
      dispatch(videoReaderActions.setState({ id, value: conf }));

      const currentModels = await fetchPlus(`${getSubsURL(id)}${SUBS_DATA_SUFFIX}`);
      setModels(currentModels);

      const uniqueIds = missingWordIdsFromModels(currentModels, definitions);

      ensureDefinitionsLoaded(proxy, [...uniqueIds], store);
    })();
  }, [proxy.loaded]);

  const helpUrl = `//${DOCS_DOMAIN}/page/software/learn/moocrobes/`;
  const vpHandle = useRef<VideoPlayerHandle>(null);
  return (
    <>
      <TopToolbar className={classes.toolbar}>
        <VideoReaderConfigLauncher
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
        <Container className={classes.button}>
          <label htmlFor="file-input">
            <Button variant="outlined" component="span">
              {translate("screens.moocrobes.load_video_file")}
            </Button>
          </label>
          <input
            id="file-input"
            type="file"
            accept="video/*"
            className={classes.input}
            onChange={(e) => handleFileSelect(e.target.files)}
          />
        </Container>
      ) : (
        <VideoPlayer
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

import { Container, makeStyles } from "@material-ui/core";
import Button from "@material-ui/core/Button";
import _ from "lodash";
import { ReactElement, useEffect, useRef, useState } from "react";
import { TopToolbar, useGetOne } from "react-admin";
import { useParams } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import HelpButton from "../../components/HelpButton";
import {
  DEFAULT_VIDEO_READER_CONFIG_STATE,
  videoReaderActions,
  VideoReaderState,
} from "../../features/content/videoReaderSlice";
import { addDefinitions } from "../../features/definition/definitionsSlice";
import { getSubsURL, missingWordIdsFromModels } from "../../lib/funclib";
import { fetchPlus } from "../../lib/libMethods";
import {
  Content,
  ContentConfigType,
  ContentParams,
  ContentProps,
  DefinitionType,
  KeyedModels,
  SUBS_DATA_SUFFIX,
} from "../../lib/types";
import VideoPlayer, { VideoPlayerHandle } from "./VideoPlayer";
import VideoReaderConfigLauncher from "./VideoReaderConfigLauncher";

const useStyles = makeStyles(() => ({
  button: { padding: "2em" },
  input: { display: "none" },
  toolbar: {
    justifyContent: "space-between",
    alignItems: "center",
  },
}));

const DATA_SOURCE = "VideoPlayerScreen.tsx";
export default function VideoPlayerScreen({ proxy }: ContentProps): ReactElement {
  const { id } = useParams<ContentParams>();
  const [fileURL, setFileURL] = useState<string>("");
  const [models, setModels] = useState<KeyedModels>({});
  const { data: content } = useGetOne<Content>("contents", id);

  const classes = useStyles();
  function handleFileSelect(files: FileList | null): void {
    if (files && files.length > 0) {
      const url = URL.createObjectURL(files[0]);
      if (url) {
        setFileURL(url);
      }
    }
  }

  const dispatch = useAppDispatch();
  const definitions = useAppSelector((state) => state.definitions);

  useEffect(() => {
    (async () => {
      const config = await proxy.sendMessagePromise<ContentConfigType>({
        source: "VideoPlayerScreen.tsx",
        type: "getContentConfigFromStore",
        value: id,
      });
      const conf: VideoReaderState = _.merge(
        _.cloneDeep({ ...DEFAULT_VIDEO_READER_CONFIG_STATE, id }),
        config?.configString ? JSON.parse(config.configString).readerState : null,
      );

      dispatch(videoReaderActions.setState({ id, value: conf }));

      const currentModels = await fetchPlus(`${getSubsURL(id)}${SUBS_DATA_SUFFIX}`);
      setModels(currentModels);

      const uniqueIds = missingWordIdsFromModels(currentModels, definitions);
      proxy
        .sendMessagePromise<DefinitionType[]>({
          source: DATA_SOURCE,
          type: "getByIds",
          value: { collection: "definitions", ids: [...uniqueIds] },
        })
        .then((definitions) => {
          dispatch(
            addDefinitions(
              definitions.map((def) => {
                return { ...def, glossToggled: false };
              }),
            ),
          );
        });
    })();
  }, []);

  const helpUrl = "https://transcrob.es/page/software/learn/moocrobes/";
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
        <HelpButton url={helpUrl} />
      </TopToolbar>
      {!fileURL ? (
        <Container className={classes.button}>
          <label htmlFor="file-input">
            <Button variant="outlined" component="span">
              Load video file
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

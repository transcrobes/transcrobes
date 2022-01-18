import { ReactElement, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import Button from "@material-ui/core/Button";
import VideoPlayer from "./VideoPlayer";
import { VideoConfig, VideoContentConfig } from "./types";
import {
  ContentConfigType,
  DefinitionType,
  Content,
  SUBS_DATA_SUFFIX,
  ContentProps,
  ContentParams,
} from "../../lib/types";
import { fetchPlus, USER_STATS_MODE } from "../../lib/lib";
import { getSubsURL, wordIdsFromModels } from "../../lib/funclib";
import { Container, makeStyles } from "@material-ui/core";

const useStyles = makeStyles(() => ({
  button: { padding: "2em" },
  input: { display: "none" },
}));

const DATA_SOURCE = "VideoPlayerScreen.tsx";
// Obtain a ref if you need to call any methods.
export default function VideoPlayerScreen({ proxy }: ContentProps): ReactElement {
  const { id } = useParams<ContentParams>();
  const [fileURL, setFileURL] = useState<string>("");
  const [contentConfig, setContentConfig] = useState<VideoContentConfig | null>(null);
  const [content, setContent] = useState<Content | null>(null);
  const classes = useStyles();
  function handleFileSelect(files: FileList | null): void {
    if (files && files.length > 0) {
      const fileURL = URL.createObjectURL(files[0]);
      if (fileURL) {
        setFileURL(fileURL);
      }
    }
  }

  function handleConfigUpdate(newConfig: VideoContentConfig) {
    const configToSave: ContentConfigType = {
      id: newConfig.id,
      configString: JSON.stringify(newConfig.config),
    };
    proxy.sendMessagePromise({
      source: "VideoPlayerScreen.tsx",
      type: "setContentConfigToStore",
      value: configToSave,
    });
  }

  useEffect(() => {
    (async () => {
      const contentConf = await proxy.sendMessagePromise<ContentConfigType>({
        source: "VideoPlayerScreen.tsx",
        type: "getContentConfigFromStore",
        value: id,
      });
      let conf: VideoConfig;
      if (contentConf && contentConf.configString) {
        conf = JSON.parse(contentConf.configString);
      } else {
        // eslint-disable-next-line prefer-const
        conf = {
          volume: 1,
          playbackRate: 1.0,
          subPlaybackRate: 1.0,
          played: 0,
          subDelay: 0,
          subFontSize: 1,
          subFontColour: { h: 0, s: 0, l: 100 },
          glossFontSize: 1,
          glossFontColour: { h: 0, s: 0, l: 100 },
          subBoxWidth: 0.8,
          subPosition: "bottom",
          glossing: USER_STATS_MODE.L1,
          segmentation: true,
          mouseover: true,
        };
      }
      const videoConfig: VideoContentConfig = {
        id: id,
        config: conf,
      };
      setContentConfig(videoConfig);

      // FIXME: this nastiness needs fixing... via redux ?
      window.transcrobesModel = await fetchPlus(`${getSubsURL(id)}${SUBS_DATA_SUFFIX}`);
      const uniqueIds = wordIdsFromModels(window.transcrobesModel);
      window.componentsConfig.proxy
        .sendMessagePromise<DefinitionType[]>({
          source: DATA_SOURCE,
          type: "getByIds",
          value: { collection: "definitions", ids: [...uniqueIds] },
        })
        .then((definitions) => {
          window.cachedDefinitions = window.cachedDefinitions || new Map<string, DefinitionType>();
          definitions.map((definition) => {
            window.cachedDefinitions.set(definition.id, definition);
          });
        });
      window.componentsConfig.proxy
        .sendMessagePromise<Content[]>({
          source: DATA_SOURCE,
          type: "getByIds",
          value: { collection: "contents", ids: [id] },
        })
        .then((contents) => {
          if (contents && contents.length > 0) {
            setContent(contents[0]);
          }
        });
    })();
  }, []);

  if (!fileURL) {
    return (
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
    );
  } else {
    return (
      <VideoPlayer
        subsUrl={getSubsURL(id)}
        videoUrl={fileURL}
        contentConfig={contentConfig}
        contentLabel={content?.title}
        onContentConfigUpdate={handleConfigUpdate}
        srcLang={content?.lang || ""}
      />
    );
  }
}

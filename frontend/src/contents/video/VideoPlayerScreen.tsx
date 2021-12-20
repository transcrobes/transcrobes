import { ReactElement, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import Button from "@material-ui/core/Button";
import { createColor } from "material-ui-color";
import { ServiceWorkerProxy } from "../../lib/proxies";
import VideoPlayer from "./videoplayer/VideoPlayer";
import { VideoConfig, VideoContentConfig } from "./videoplayer/types";
import { ContentConfigType, DefinitionType, Content, SUBS_DATA_SUFFIX } from "../../lib/types";
import { fetchPlus, USER_STATS_MODE } from "../../lib/lib";
import { getSubsURL, wordIdsFromModels } from "../../lib/funclib";

type ContentParams = {
  id: string;
};

type ContentProps = {
  proxy: ServiceWorkerProxy;
};

const DATA_SOURCE = "VideoPlayerScreen.tsx";
// Obtain a ref if you need to call any methods.
export default function VideoPlayerScreen({ proxy }: ContentProps): ReactElement {
  const { id } = useParams<ContentParams>();
  const [fileURL, setFileURL] = useState<string>("");
  const [contentConfig, setContentConfig] = useState<VideoContentConfig | null>(null);
  const [content, setContent] = useState<Content | null>(null);

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
          played: 0,
          subDelay: 0,
          subFontSize: 1,
          subFontColour: createColor("white"),
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
      <div id="container" style={{ maxWidth: "1000px" }}>
        <label htmlFor="file-input">
          <Button variant="contained" color="primary" component="span">
            Load video file
          </Button>
        </label>
        <input
          id="file-input"
          type="file"
          accept="video/*"
          style={{ display: "none" }}
          onChange={(e) => handleFileSelect(e.target.files)}
        />
      </div>
    );
  } else {
    return (
      <div id="container" style={{ maxWidth: "1000px" }}>
        <VideoPlayer
          subsUrl={getSubsURL(id)}
          videoUrl={fileURL}
          contentConfig={contentConfig}
          contentLabel={content?.title}
          onContentConfigUpdate={handleConfigUpdate}
          srcLang={content?.lang || ""}
        />
      </div>
    );
  }
}

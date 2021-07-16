import { ReactElement, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import Button from "@material-ui/core/Button";
import { DataProvider } from "ra-core";
import { createColor } from "material-ui-color";
import { ServiceWorkerProxy } from "../../lib/proxies";
import VideoPlayer from "./videoplayer/VideoPlayer";
import { VideoConfig, VideoContentConfig } from "./videoplayer/types";
import { ContentDocument } from "../../database/Schema";
import { ContentConfigType } from "../../lib/types";
import { fetchPlus } from "../../lib/lib";

type ContentParams = {
  id: string;
};

type ContentProps = {
  proxy: ServiceWorkerProxy;
  dataProvider: DataProvider;
};

// Obtain a ref if you need to call any methods.
export default function VideoPlayerScreen({ proxy, dataProvider }: ContentProps): ReactElement {
  const { id } = useParams<ContentParams>();
  const SUBS_URL = `/api/v1/data/content/${id}/subtitles.vtt`;
  const [fileURL, setFileURL] = useState<string>("");
  const [contentConfig, setContentConfig] = useState<VideoContentConfig | null>(null);
  const [contentDocument, setContentDocument] = useState<ContentDocument | null>(null);

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
          subBoxWidth: 0.7,
          subPosition: "bottom",
        };
      }
      const videoConfig: VideoContentConfig = {
        id: id,
        config: conf,
      };
      setContentConfig(videoConfig);

      // FIXME: this nastiness needs fixing... via redux ?
      window.transcrobesModel = await fetchPlus(`${SUBS_URL}.data.json`);
      const doc = await dataProvider.getOne<ContentDocument>("contents", { id: id });
      if (doc.data) setContentDocument(doc.data);
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
          subsUrl={SUBS_URL}
          videoUrl={fileURL}
          contentConfig={contentConfig}
          contentLabel={contentDocument?.title}
          onContentConfigUpdate={handleConfigUpdate}
          srcLang={contentDocument?.lang || ""}
        />
      </div>
    );
  }
}

import { useParams } from "react-router-dom";
import { useAuthenticated } from "react-admin";
import D2Reader, { Locator } from "@d-i-t-a/reader";
import WebReader from "./ui/WebReader";
import injectables from "./injectables";
import { USER_STATS_MODE } from "../../lib/lib";
import { createTheme, ThemeProvider } from "@material-ui/core";
import { AppState, ContentConfigType, ContentProps } from "../../lib/types";
import { Injectable } from "@d-i-t-a/reader/dist/types/navigator/IFrameNavigator";
import {
  DEFAULT_FONT_FAMILY,
  DEFAULT_FONT_FAMILY_CHINESE,
  DEFAULT_FONT_SIZE,
  ReaderSettings,
} from "./types";
import { ReactElement, useEffect, useState } from "react";
import { useSelector } from "react-redux";
type ContentParams = {
  id: string;
};

declare global {
  interface Window {
    r2d2bc: D2Reader;
    etfLoaded: Set<string>; // this could probably be a boolean?
    r2d2bcFontSize: number;
  }
}

// FIXME: This should be done as content preferences saved at each change, like the video player
window.readerConfig = {
  segmentation: true,
  mouseover: true,
  glossing: USER_STATS_MODE.L1,
  popupParent: window.document.body,
};

export type ReaderContentConfig = {
  id: string;
  config?: ReaderSettings;
};

export default function Reader({ proxy }: ContentProps): ReactElement {
  useAuthenticated(); // redirects to login if not authenticated, required because shown as RouteWithoutLayout
  const { id } = useParams<ContentParams>();
  const url = new URL(`/api/v1/data/content/${id}/manifest.json`, window.location.href);

  const [contentConfig, setContentConfig] = useState<ReaderSettings>();

  function handleConfigUpdate(newConfig: ReaderSettings) {
    const configToSave: ContentConfigType = {
      id: id,
      configString: JSON.stringify({ readerState: newConfig }),
    };
    proxy.sendMessagePromise({
      source: "Reader.tsx",
      type: "setContentConfigToStore",
      value: configToSave,
    });
  }

  useEffect(() => {
    (async () => {
      const contentConf = await proxy.sendMessagePromise<ContentConfigType>({
        source: "Reader.tsx",
        type: "getContentConfigFromStore",
        value: id,
      });
      let conf: ReaderSettings;
      if (contentConf && contentConf.configString) {
        const { readerState } = JSON.parse(contentConf.configString);
        conf = readerState;
        window.readerConfig.segmentation = readerState.segmentation;
        window.readerConfig.mouseover = readerState.mouseover;
        window.readerConfig.glossing = readerState.glossing;
      } else {
        conf = {
          isScrolling: false,
          fontSize: DEFAULT_FONT_SIZE,
          glossing: USER_STATS_MODE.L1,
          segmentation: true,
          mouseover: true,
          fontFamily: DEFAULT_FONT_FAMILY,
          fontFamilyChinese: DEFAULT_FONT_FAMILY_CHINESE,
          currentTocUrl: null,
          atStart: true,
          atEnd: false,
        };
      }
      setContentConfig(conf);
    })();
  }, []);

  // FIXME: this is currently brokens, meaning it is impossible to use paginated mode!!!
  // useEffect(() => {
  //   // This is a hack to make sure that the D2Reader resizes after all the web components have
  //   // been loaded. If not, in scrolling mode, the size (and so end of the iframe viewport gets finalised
  //   // before the components have been loaded, and potentially large amounts of text are not visible.
  //   // While it seems like a hack, it is also unclear how one might do this better, as this needs to be
  //   // done after the last component has loaded. Potentially setTimeout could be used instead, repeating
  //   // once more if etfLoaded still has a "loaded", otherwise stop. This is pretty lightweight though, so
  //   // for the moment it will suffice.
  //   // There might be a prettier way of doing this without setting the fontSize to itself, but I couldn't
  //   // find it.
  //   const interval = setInterval(() => {
  //     console.log("interval running", window.r2d2bc);
  //     if (!window.r2d2bc) return;
  //     window.r2d2bc.settings.isPaginated().then((paginated) => {
  //       console.log("interval paginated", paginated);
  //       if (!paginated) {
  //         const iframe = document.querySelector("#D2Reader-Container")?.querySelector("iframe");
  //         if (!!iframe && iframe.contentWindow && iframe.contentWindow.etfLoaded) {
  //           if (iframe.contentWindow.etfLoaded.delete("loaded")) {
  //             window.r2d2bc.applyUserSettings({ fontSize: window.r2d2bcFontSize });
  //           }
  //         }
  //       }
  //     });
  //   }, 500);
  //   return () => clearInterval(interval);
  // }, []);

  const themeName = useSelector((state: AppState) => state.theme);
  const theme = createTheme({
    palette: {
      type: themeName || "light", // Switching the dark mode on is a single property value change.
    },
  });
  const augmentedInjectables: Injectable[] = [];
  for (const fontFamily of ["serif", "sans-serif", "opendyslexic", "monospace"]) {
    for (const fontFamilyChinese of [
      "notasanslight",
      "notaserifextralight",
      "notaserifregular",
      "mashanzheng",
    ]) {
      augmentedInjectables.push({
        type: "style",
        url: `${origin}/chinese.css`,
        fontFamily: `${fontFamily},${fontFamilyChinese}`,
      });
    }
  }

  return (
    <ThemeProvider theme={theme}>
      {contentConfig ? (
        <WebReader
          readerSettings={contentConfig}
          doConfigUpdate={handleConfigUpdate}
          webpubManifestUrl={url.href}
          injectables={[...injectables, ...augmentedInjectables]}
        />
      ) : (
        <div></div>
      )}
    </ThemeProvider>
  );
}

import { useEffect } from "react";
import { useParams } from "react-router-dom";

import D2Reader from "@d-i-t-a/reader";
import { ChakraProvider } from "@chakra-ui/react";
import { getTheme } from "../../webreader/ui/theme";
import "@nypl/design-system-react-components/dist/styles.css";
// import WebReader, { getTheme } from "@nypl/web-reader";
// import { getTheme } from "@nypl/web-reader/dist/types/ui/theme";
// import { getTheme } from "@nypl/web-reader/dist/types/ui/theme/index";
// import injectables from "./injectables";
import WebReader from "../../webreader";

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

export default function Reader(): JSX.Element {
  const { id } = useParams<ContentParams>();
  const url = new URL(`/api/v1/data/content/${id}/manifest.json`, window.location.href);

  useEffect(() => {
    // This is a hack to make sure that the D2Reader resizes after all the web components have
    // been loaded. If not, in scrolling mode, the size (and so end of the iframe viewport gets finalised
    // before the components have been loaded, and potentially large amounts of text are not visible.
    // While it seems like a hack, it is also unclear how one might do this better, as this needs to be
    // done after the last component has loaded. Potentially setTimeout could be used instead, repeating
    // once more if etfLoaded still has a "loaded", otherwise stop. This is pretty lightweight though, so
    // for the moment it will suffice.
    // There might be a prettier way of doing this without setting the fontSize to itself, but I couldn't
    // find it.
    const interval = setInterval(() => {
      if (!window.r2d2bc) return;
      window.r2d2bc.settings.isPaginated().then((paginated) => {
        if (!paginated) {
          const iframe = document.querySelector("#D2Reader-Container")?.querySelector("iframe");
          if (!!iframe && iframe.contentWindow && iframe.contentWindow.etfLoaded) {
            if (iframe.contentWindow.etfLoaded.delete("loaded")) {
              window.r2d2bc.applyUserSettings({ fontSize: window.r2d2bcFontSize });
            }
          }
        }
      });
    }, 500);
    return () => clearInterval(interval);
  }, []);

  return (
    <ChakraProvider theme={getTheme("day")}>
      {/* <WebReader webpubManifestUrl={url.href} injectables={injectables} /> */}
      <WebReader webpubManifestUrl={url.href} />
    </ChakraProvider>
  );
}

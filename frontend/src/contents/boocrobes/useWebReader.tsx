import React from "react";
import { fetchJson } from "./utils/fetch";
import HtmlReaderContent from "./ui/HtmlReaderContent";
import useHtmlReader from "./ui";
import { UseWebReaderArguments, HTMLActiveReader, LoadingReader, WebpubManifest } from "./types";
import { DEFAULT_HEIGHT, DEFAULT_SHOULD_GROW_WHEN_SCROLLING } from "./constants";

/**
 * The React hook that exposes the main API into the reader. It
 * will determine the type of the webpub, and then use the correct reader
 * for that type.
 */
export default function useWebReader(
  args: UseWebReaderArguments,
): HTMLActiveReader | LoadingReader {
  const {
    doConfigUpdate,
    webpubManifestUrl,
    getContent,
    injectables,
    injectablesFixed,
    height = DEFAULT_HEIGHT,
    growWhenScrolling = DEFAULT_SHOULD_GROW_WHEN_SCROLLING,
    readerSettings,
  } = args;
  const [manifest, setManifest] = React.useState<WebpubManifest>();
  const [error, setError] = React.useState<Error | null>(null);
  // if there is an error that occurred, we want to throw it so that
  // consumers can catch it in an ErrorBoundary
  if (error) {
    throw error;
  }

  /**
   * Our HTML reader and PDf Reader. Note that we cannot conditionally
   * call a React hook, so we must _always_ call the hook, but allow for the
   * case where we call the hook with `undefined`, which tells the hook that
   * that format is inactive, and it will in turn return the InactiveState.
   */
  const htmlReader = useHtmlReader({
    webpubManifestUrl,
    manifest,
    getContent,
    doConfigUpdate,
    injectables,
    injectablesFixed,
    height,
    growWhenScrolling,
    readerSettings,
  });

  // fetch the manifest and set it in state
  React.useEffect(() => {
    fetchJson<WebpubManifest>(webpubManifestUrl).then(setManifest).catch(setError);
  }, [webpubManifestUrl]);
  // first if we are still fetching the manifest, return loading
  if (!manifest || !htmlReader) {
    return {
      isLoading: true,
      content: <HtmlReaderContent height={height} isScrolling={false} growsWhenScrolling={false} />,
      manifest: null,
      navigator: null,
      state: null,
      type: null,
    };
  }

  return htmlReader;
}

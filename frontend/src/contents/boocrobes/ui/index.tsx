import D2Reader from "@d-i-t-a/reader";
import React, { useState } from "react";
import { Locator } from "@d-i-t-a/reader";
import {
  GetContent,
  Injectable,
  NavigatorAPI,
} from "@d-i-t-a/reader/dist/types/navigator/IFrameNavigator";
import debounce from "debounce";
import { useSelector } from "react-redux";

import { DEFAULT_HEIGHT, DEFAULT_SHOULD_GROW_WHEN_SCROLLING, HEADER_HEIGHT } from "../constants";
import HtmlReaderContent from "./HtmlReaderContent";
import { USER_STATS_MODE_KEY_VALUES } from "../../../lib/lib";
import { AppState } from "../../../lib/types";
import {
  ColorMode,
  HtmlReaderState,
  ReaderReturn,
  ReaderArguments,
  FontFamily,
  D2ColorMode,
} from "../types";

type HtmlState = HtmlReaderState & {
  reader: D2Reader | undefined;
  location: undefined | Locator;
};

/**
 * If we provide injectables that are not found, the app won't load at all.
 * Therefore we will not provide any default injectables.
 */
const defaultInjectables: Injectable[] = [];
const defaultInjectablesFixed: Injectable[] = [];

export type HtmlAction =
  | { type: "SET_READER"; reader: D2Reader }
  | { type: "SET_GLOSSING"; glossing: USER_STATS_MODE_KEY_VALUES }
  | { type: "SET_SEGMENTATION"; segmentation: boolean }
  | { type: "SET_MOUSEOVER"; mouseover: boolean }
  | { type: "SET_SCROLL"; isScrolling: boolean }
  | { type: "SET_FONT_SIZE"; size: number }
  | { type: "SET_FONT_FAMILY"; family: FontFamily }
  | { type: "SET_CURRENT_TOC_URL"; currentTocUrl: string }
  | { type: "LOCATION_CHANGED"; location: Locator }
  | { type: "BOOK_BOUNDARY_CHANGED"; atStart: boolean; atEnd: boolean };

function htmlReducer(state: HtmlState, action: HtmlAction): HtmlState {
  switch (action.type) {
    case "SET_READER": {
      // set all the initial settings taken from the reader
      const settings = action.reader.currentSettings();
      return {
        reader: action.reader,
        isScrolling: settings.verticalScroll,
        fontSize: settings.fontSize,
        fontFamily: r2FamilyToFamily[settings.fontFamily] ?? "publisher",
        currentTocUrl: action.reader.mostRecentNavigatedTocItem(),
        glossing: state.glossing,
        mouseover: state.mouseover,
        segmentation: state.segmentation,
        location: undefined,
        atStart: true,
        atEnd: false,
      };
    }

    case "SET_GLOSSING":
      return {
        ...state,
        glossing: action.glossing,
      };

    case "SET_SEGMENTATION":
      return {
        ...state,
        segmentation: action.segmentation,
      };

    case "SET_MOUSEOVER":
      return {
        ...state,
        mouseover: action.mouseover,
      };

    case "SET_SCROLL":
      return {
        ...state,
        isScrolling: action.isScrolling,
      };

    case "SET_FONT_SIZE":
      return {
        ...state,
        fontSize: action.size,
      };

    case "SET_FONT_FAMILY":
      return {
        ...state,
        fontFamily: action.family,
      };

    case "SET_CURRENT_TOC_URL":
      return {
        ...state,
        currentTocUrl: action.currentTocUrl,
      };

    case "LOCATION_CHANGED":
      return {
        ...state,
        location: action.location,
      };

    case "BOOK_BOUNDARY_CHANGED":
      return {
        ...state,
        atStart: action.atStart,
        atEnd: action.atEnd,
      };
    default:
      throw new Error("unknown state operation");
  }
}

const FONT_SIZE_STEP = 4;

export default function useHtmlReader(args: ReaderArguments): ReaderReturn {
  const {
    webpubManifestUrl,
    manifest,
    getContent,
    injectables = defaultInjectables,
    injectablesFixed = defaultInjectablesFixed,
    height = DEFAULT_HEIGHT,
    growWhenScrolling = DEFAULT_SHOULD_GROW_WHEN_SCROLLING,
    readerSettings,
  } = args ?? {};

  const defaultIsScrolling = readerSettings?.isScrolling ?? false;

  const [state, dispatch] = React.useReducer(htmlReducer, {
    isScrolling: defaultIsScrolling,
    fontSize: 16,
    glossing: window.readerConfig.glossing,
    mouseover: window.readerConfig.mouseover,
    segmentation: window.readerConfig.segmentation,
    fontFamily: "sans-serif",
    currentTocUrl: null,
    reader: undefined,
    location: undefined,
    atStart: true,
    atEnd: false,
  });
  const [forceRefresh, setForceRefresh] = useState(false);
  // const theme = useTheme();
  const theme = useSelector((state: AppState) => state.theme);
  // used to handle async errors thrown in useEffect
  const [error, setError] = React.useState<Error | undefined>(undefined);
  if (error) {
    throw error;
  }

  const { reader, fontSize, location } = state;

  // initialize the reader
  React.useEffect(() => {
    // bail out if there is no webpubManifestUrl. It indicates this format is not being used.
    if (!webpubManifestUrl) return;
    const url = new URL(webpubManifestUrl);

    const userSettings = {
      verticalScroll: !!state.isScrolling,
      appearance: getColorMode(theme),
    };

    D2Reader.build({
      url,
      injectables: injectables,
      injectablesFixed: injectablesFixed,
      attributes: {
        navHeight: HEADER_HEIGHT,
        margin: 16,
      },
      rights: {
        /**
         * Makes the reader fetch every resource before rendering, which
         * takes forever.
         */
        autoGeneratePositions: false,
      },
      userSettings: userSettings,
      api: {
        getContent: getContent as GetContent,
        updateCurrentLocation: async (location: Locator) => {
          // This is needed so that setBookBoundary has the updated "reader" value.
          dispatch({ type: "LOCATION_CHANGED", location: location });
          return location;
        },
        onError: function (e: Error) {
          setError(e);
        },
      } as NavigatorAPI,
    }).then((reader) => {
      dispatch({ type: "SET_READER", reader });
      enableResizeEvent(reader, dispatch);
    });
  }, [
    webpubManifestUrl,
    getContent,
    injectables,
    injectablesFixed,
    defaultIsScrolling,
    forceRefresh,
  ]);

  // Re-calculate page location on scroll/TOC navigation/page button press
  React.useEffect(() => {
    if (!location || !reader) return;
    setBookBoundary(reader, dispatch);
  }, [location, reader, state.isScrolling, state.glossing, state.segmentation, state.mouseover]);

  // prev and next page functions
  const goForward = React.useCallback(async () => {
    if (!reader) return;
    const isLastPage = await reader.atEnd();
    reader.nextPage();
    if (isLastPage) {
      // FIXME: This will not work for links containing sub-links
      // b/c reader.nextPage saves the raw toc link without the elementID
      dispatch({
        type: "SET_CURRENT_TOC_URL",
        currentTocUrl: reader.mostRecentNavigatedTocItem(),
      });
    }
  }, [reader]);

  const goBackward = React.useCallback(async () => {
    if (!reader) return;
    const isFirstPage = await reader.atStart();
    reader.previousPage();
    if (isFirstPage) {
      dispatch({
        type: "SET_CURRENT_TOC_URL",
        currentTocUrl: reader.mostRecentNavigatedTocItem(),
      });
    }
  }, [reader]);

  const setScroll = React.useCallback(
    async (val: boolean) => {
      await reader?.scroll(val);
      dispatch({ type: "SET_SCROLL", isScrolling: val });
    },
    [reader],
  );

  const increaseFontSize = React.useCallback(async () => {
    if (!reader) return;
    const newSize = fontSize + FONT_SIZE_STEP;
    await reader.applyUserSettings({ fontSize: newSize });
    dispatch({ type: "SET_FONT_SIZE", size: newSize });
  }, [reader, fontSize]);

  const decreaseFontSize = React.useCallback(async () => {
    if (!reader) return;
    const newSize = fontSize - FONT_SIZE_STEP;
    await reader.applyUserSettings({ fontSize: newSize });
    dispatch({ type: "SET_FONT_SIZE", size: newSize });
  }, [reader, fontSize]);

  const setFontFamily = React.useCallback(
    async (family: FontFamily) => {
      if (!reader) return;
      const r2Family = familyToR2Family[family];
      // the applyUserSettings type is incorrect. We are supposed to pass in a string.
      await reader.applyUserSettings({ fontFamily: r2Family as any });
      dispatch({ type: "SET_FONT_FAMILY", family });
    },
    [reader],
  );

  const goToPage = React.useCallback(
    (href) => {
      if (!reader) return;
      // Adding try/catch here because goTo throws a TypeError
      // if the TOC link you clicked on was the current page..
      try {
        reader.goTo({ href } as Locator); // This needs to be fixed, locations should be optional.
        dispatch({ type: "SET_CURRENT_TOC_URL", currentTocUrl: href });
      } catch (error) {
        console.error(error);
      }
    },
    [reader],
  );

  function forceReaderRefresh() {
    setForceRefresh(!forceRefresh);
  }

  const setGlossing = React.useCallback(
    (glossing: USER_STATS_MODE_KEY_VALUES) => {
      if (!reader) return;
      window.readerConfig.glossing = glossing;
      dispatch({ type: "SET_GLOSSING", glossing });
      forceReaderRefresh();
    },
    [reader],
  );
  const setSegmentation = React.useCallback(
    (segmentation: boolean) => {
      if (!reader) return;
      dispatch({ type: "SET_SEGMENTATION", segmentation: segmentation });
      window.readerConfig.segmentation = segmentation;
      forceReaderRefresh();
    },
    [reader],
  );
  const setMouseover = React.useCallback(
    (mouseover: boolean) => {
      if (!reader) return;
      dispatch({ type: "SET_MOUSEOVER", mouseover });
      window.readerConfig.mouseover = mouseover;
      forceReaderRefresh();
    },
    [reader],
  );

  const isLoading = !reader;

  // this format is inactive, return null
  if (!webpubManifestUrl || !manifest) return null;

  // we are initializing the reader
  if (isLoading) {
    return {
      type: null,
      isLoading: true,
      content: (
        <HtmlReaderContent
          height={height}
          isScrolling={state.isScrolling}
          growsWhenScrolling={growWhenScrolling}
        />
      ),
      navigator: null,
      manifest: null,
      state: null,
    };
  }

  // the reader is active
  return {
    type: "HTML",
    isLoading: false,
    content: (
      <HtmlReaderContent
        height={height}
        isScrolling={state.isScrolling}
        growsWhenScrolling={growWhenScrolling}
      />
    ),
    state,
    manifest,
    navigator: {
      goForward,
      goBackward,
      setGlossing,
      setSegmentation,
      setMouseover,
      setScroll,
      increaseFontSize,
      decreaseFontSize,
      setFontFamily,
      goToPage,
    },
  };
}

function getColorMode(localMode: ColorMode): D2ColorMode {
  switch (localMode) {
    case "light":
      return "readium-default-on";
    case "dark":
      return "readium-night-on";
    case "sepia":
      return "readium-sepia-on";
    default:
      console.error("COLOR MODE SLIPPED THROUGH", localMode);
      return "readium-default-on";
  }
}

/**
 * We need to map from our family values to R2D2BC's family values.
 */
const familyToR2Family: Record<FontFamily, string> = {
  publisher: "Original",
  serif: "serif",
  "sans-serif": "sans-serif",
  "open-dyslexic": "opendyslexic",
};
/**
 * And vice-versa
 */
const r2FamilyToFamily: Record<string, FontFamily | undefined> = {
  Original: "publisher",
  serif: "serif",
  "sans-serif": "sans-serif",
  opendyslexic: "open-dyslexic",
};

async function setBookBoundary(
  reader: D2Reader,
  dispatch: React.Dispatch<HtmlAction>,
): Promise<void> {
  const isFirstResource = (await reader.currentResource()) === 0;
  const isResourceStart = (await reader.atStart()) && isFirstResource;

  const isLastResource = (await reader.currentResource()) === (await reader.totalResources()) - 1; // resource index starts with 0
  const isResourceEnd = (await reader.atEnd()) && isLastResource;

  dispatch({
    type: "BOOK_BOUNDARY_CHANGED",
    atStart: isResourceStart,
    atEnd: isResourceEnd,
  });
}

function enableResizeEvent(reader: D2Reader, dispatch: React.Dispatch<HtmlAction>) {
  const resizeHandler = () => {
    setBookBoundary(reader, dispatch);
  };

  const debouncedResizeHandler = debounce(resizeHandler, 500);
  window.addEventListener("resize", debouncedResizeHandler, { passive: true });
}

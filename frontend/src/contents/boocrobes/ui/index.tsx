import D2Reader from "@d-i-t-a/reader";
import React, { useState } from "react";
// import {
//   GetContent,
//   Injectable,
//   NavigatorAPI,
// } from "@d-i-t-a/reader/dist/types/navigator/IFrameNavigator";
import debounce from "debounce";
import { useSelector } from "react-redux";

import { DEFAULT_HEIGHT, DEFAULT_SHOULD_GROW_WHEN_SCROLLING, HEADER_HEIGHT } from "../constants";
import HtmlReaderContent from "./HtmlReaderContent";
import { USER_STATS_MODE_KEY_VALUES } from "../../../lib/lib";
import { AppState } from "../../../lib/types";
import {
  ColorMode,
  ReaderReturn,
  ReaderArguments,
  FontFamily,
  D2ColorMode,
  FontFamilyChinese,
  HtmlState,
  DEFAULT_FONT_SIZE,
  DEFAULT_FONT_FAMILY,
  DEFAULT_FONT_FAMILY_CHINESE,
} from "../types";

const FONT_SIZE_STEP = 4;

/**
 * If we provide injectables that are not found, the app won't load at all.
 * Therefore we will not provide any default injectables.
 */
const defaultInjectables: any[] = [];
const defaultInjectablesFixed: any[] = [];

export type HtmlAction =
  | { type: "SET_READER"; reader: any }
  | { type: "SET_GLOSSING"; glossing: USER_STATS_MODE_KEY_VALUES }
  | { type: "SET_SEGMENTATION"; segmentation: boolean }
  | { type: "SET_MOUSEOVER"; mouseover: boolean }
  | { type: "SET_SCROLL"; isScrolling: boolean }
  | { type: "SET_FONT_SIZE"; size: number }
  | { type: "SET_FONT_FAMILY"; family: FontFamily }
  | { type: "SET_FONT_FAMILY_CHINESE"; family: FontFamilyChinese }
  | { type: "SET_CURRENT_TOC_URL"; currentTocUrl: string }
  | { type: "LOCATION_CHANGED"; location: any }
  | { type: "BOOK_BOUNDARY_CHANGED"; atStart: boolean; atEnd: boolean };

function htmlReducer(state: HtmlState, action: HtmlAction): HtmlState {
  let newState = state;
  switch (action.type) {
    case "SET_READER": {
      if (state.location) {
        action.reader.goTo(state.location);
      }
      return {
        reader: action.reader,
        isScrolling: state.isScrolling,
        fontSize: state.fontSize,
        currentTocUrl: state.currentTocUrl,
        onUpdate: state.onUpdate,
        fontFamily: state.fontFamily,
        fontFamilyChinese: state.fontFamilyChinese,
        glossing: state.glossing,
        mouseover: state.mouseover,
        segmentation: state.segmentation,
        location: state.location,
        atStart: state.atStart,
        atEnd: state.atEnd,
      };
    }
    case "SET_GLOSSING":
      newState = {
        ...state,
        glossing: action.glossing,
      };
      break;
    case "SET_SEGMENTATION":
      newState = {
        ...state,
        segmentation: action.segmentation,
      };
      break;
    case "SET_MOUSEOVER":
      newState = {
        ...state,
        mouseover: action.mouseover,
      };
      break;
    case "SET_SCROLL":
      newState = {
        ...state,
        isScrolling: action.isScrolling,
      };
      break;
    case "SET_FONT_SIZE":
      newState = {
        ...state,
        fontSize: action.size,
      };
      break;
    case "SET_FONT_FAMILY":
      newState = {
        ...state,
        fontFamily: action.family,
      };
      break;
    case "SET_FONT_FAMILY_CHINESE":
      newState = {
        ...state,
        fontFamilyChinese: action.family,
      };
      break;
    case "SET_CURRENT_TOC_URL":
      newState = {
        ...state,
        currentTocUrl: action.currentTocUrl,
      };
      break;
    case "LOCATION_CHANGED":
      newState = {
        ...state,
        location: action.location,
      };
      break;
    case "BOOK_BOUNDARY_CHANGED":
      newState = {
        ...state,
        atStart: action.atStart,
        atEnd: action.atEnd,
      };
      break;
    default:
      throw new Error("unknown state operation");
  }
  if (newState.onUpdate) {
    const { onUpdate, reader, ...readerSettings } = newState;
    newState.onUpdate(readerSettings);
  }
  return newState;
}

export default function useHtmlReader(args: ReaderArguments): ReaderReturn {
  const {
    webpubManifestUrl,
    manifest,
    getContent,
    doConfigUpdate,
    injectables = defaultInjectables,
    injectablesFixed = defaultInjectablesFixed,
    height = DEFAULT_HEIGHT,
    growWhenScrolling = DEFAULT_SHOULD_GROW_WHEN_SCROLLING,
    readerSettings,
  } = args;

  const defaultIsScrolling = !!readerSettings?.isScrolling;
  const [state, dispatch] = React.useReducer(htmlReducer, {
    isScrolling: defaultIsScrolling,
    fontSize: readerSettings?.fontSize || DEFAULT_FONT_SIZE,
    glossing: readerSettings?.glossing || window.readerConfig.glossing,
    mouseover: readerSettings?.mouseover || window.readerConfig.mouseover,
    segmentation: readerSettings?.segmentation || window.readerConfig.segmentation,
    fontFamily: readerSettings?.fontFamily || DEFAULT_FONT_FAMILY,
    fontFamilyChinese: readerSettings?.fontFamilyChinese || DEFAULT_FONT_FAMILY_CHINESE,
    currentTocUrl: readerSettings?.currentTocUrl || null,
    atStart: readerSettings?.atStart || true,
    atEnd: readerSettings?.atEnd || false,
    location: readerSettings?.location,
    reader: undefined,
    onUpdate: doConfigUpdate,
  });

  const [forceRefresh, setForceRefresh] = useState(false);
  const theme = useSelector((state: AppState) => state.theme);
  // used to handle async errors thrown in useEffect
  const [error, setError] = React.useState<Error | undefined>(undefined);
  if (error) {
    throw error;
  }

  const { reader, fontSize, fontFamily, fontFamilyChinese } = state;

  // initialize the reader
  React.useEffect(() => {
    // bail out if there is no webpubManifestUrl. It indicates this format is not being used.
    if (!webpubManifestUrl) return;
    const url = new URL(webpubManifestUrl);

    const userSettings = {
      verticalScroll: !!state.isScrolling,
      appearance: getColorMode(theme),
      fontFamily: `${state.fontFamily},${state.fontFamilyChinese}`,
      fontSize: state.fontSize,
      currentTocUrl: state.currentTocUrl,
      location: state.location,
      atStart: state.atStart,
      atEnd: state.atEnd,
    };
    D2Reader.load({
      url,
      injectables: injectables,
      injectablesFixed: injectablesFixed,
      attributes: {
        navHeight: HEADER_HEIGHT,
        // + 20 as an extra buffer on mobile
        margin: HEADER_HEIGHT + 20,
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
        getContent: getContent as any,
        updateCurrentLocation: async (loc: any) => {
          // This is needed so that setBookBoundary has the updated "reader" value.
          dispatch({ type: "LOCATION_CHANGED", location: loc });
          return loc;
        },
        onError: function (e: Error) {
          setError(e);
        },
      } as any,
    }).then((reader) => {
      dispatch({ type: "SET_READER", reader });
      window.r2d2bc = reader;
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
    if (!state.location || !reader) return;
    setBookBoundary(reader, dispatch);
  }, [
    state.location,
    reader,
    state.isScrolling,
    state.glossing,
    state.segmentation,
    state.mouseover,
  ]);

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
      await D2Reader.scroll(val);
      dispatch({ type: "SET_SCROLL", isScrolling: val });
    },
    [reader],
  );

  const increaseFontSize = React.useCallback(async () => {
    if (!reader) return;
    const newSize = fontSize + FONT_SIZE_STEP;
    window.readerConfig.fontSize = newSize;
    await D2Reader.applyUserSettings({ fontSize: newSize });
    dispatch({ type: "SET_FONT_SIZE", size: newSize });
  }, [reader, fontSize]);

  const decreaseFontSize = React.useCallback(async () => {
    if (!reader) return;
    const newSize = fontSize - FONT_SIZE_STEP;
    window.readerConfig.fontSize = newSize;
    await D2Reader.applyUserSettings({ fontSize: newSize });
    dispatch({ type: "SET_FONT_SIZE", size: newSize });
  }, [reader, fontSize]);

  const setFontFamily = React.useCallback(
    async (family: FontFamily) => {
      if (!reader) return;
      // the applyUserSettings type is incorrect. We are supposed to pass in a string.
      await D2Reader.applyUserSettings({
        fontFamily:
          family === "Original" ? "Original" : (`${family},${state.fontFamilyChinese}` as any),
      });
      dispatch({ type: "SET_FONT_FAMILY", family });
    },
    [reader, fontFamily, fontFamilyChinese],
  );

  const setFontFamilyChinese = React.useCallback(
    async (family: FontFamilyChinese) => {
      if (!reader) return;
      // the applyUserSettings type is incorrect. We are supposed to pass in a string.
      await D2Reader.applyUserSettings({
        fontFamily:
          state.fontFamily === "Original" ? "Original" : (`${state.fontFamily},${family}` as any),
      });
      dispatch({ type: "SET_FONT_FAMILY_CHINESE", family });
    },
    [reader, fontFamily, fontFamilyChinese],
  );

  const goToPage = React.useCallback(
    (href) => {
      if (!reader) return;
      // Adding try/catch here because goTo throws a TypeError
      // if the TOC link you clicked on was the current page..
      try {
        reader.goTo({ href } as any); // This needs to be fixed, locations should be optional.
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
      setFontFamilyChinese,
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

async function setBookBoundary(reader: any, dispatch: React.Dispatch<HtmlAction>): Promise<void> {
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

function enableResizeEvent(reader: any, dispatch: React.Dispatch<HtmlAction>) {
  const resizeHandler = () => {
    setBookBoundary(reader, dispatch);
  };

  const debouncedResizeHandler = debounce(resizeHandler, 500);
  window.addEventListener("resize", debouncedResizeHandler, { passive: true });
}

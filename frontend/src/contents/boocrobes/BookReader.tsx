import D2Reader from "@d-i-t-a/reader";
import KeyboardArrowLeftIcon from "@mui/icons-material/KeyboardArrowLeft";
import KeyboardArrowRightIcon from "@mui/icons-material/KeyboardArrowRight";
import { Box, createTheme, StyledEngineProvider, ThemeProvider } from "@mui/material";
import debounce from "debounce";
import { ReactElement, useCallback, useEffect, useRef, useState } from "react";
import { Button, useAuthenticated } from "react-admin";
import { useParams } from "react-router-dom";
import { AdminStore, AppDispatch, store } from "../../app/createStore";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import Mouseover from "../../components/content/td/Mouseover";
import TokenDetails from "../../components/content/td/TokenDetails";
import Loading from "../../components/Loading";
import {
  bookReaderActions,
  BookReaderState,
  DEFAULT_BOOK_READER_CONFIG_STATE,
} from "../../features/content/bookReaderSlice";
import { getRefreshedState } from "../../features/content/contentSlice";
import { fetcher } from "../../lib/fetcher";
import { ContentParams, ContentProps } from "../../lib/types";
import {
  ColorMode,
  D2ColorMode,
  DEFAULT_HEIGHT,
  DEFAULT_SHOULD_GROW_WHEN_SCROLLING,
  FOOTER_HEIGHT,
  HEADER_HEIGHT,
} from "../common/types";
import Header from "./Header";
import injectables from "./injectables";
import { WebpubManifest } from "./WebpubManifestTypes/WebpubManifest";

declare global {
  interface Window {
    r2d2bc: any;
    etfLoaded?: Set<string>; // this could probably be a boolean?
    r2d2bcFontSize: number;
    bookId: string;
    transcrobesStore: AdminStore;
  }
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
async function setBookBoundary(reader: any, dispatch: AppDispatch, id: string): Promise<void> {
  const isFirstResource = reader.currentResource === 0;
  const isResourceStart = reader.atStart && isFirstResource;

  const isLastResource = reader.currentResource === reader.totalResources - 1; // resource index starts with 0
  const isResourceEnd = reader.atEnd && isLastResource;

  dispatch(
    bookReaderActions.setBookBoundaryChanged({
      id,
      value: {
        atStart: isResourceStart,
        atEnd: isResourceEnd,
      },
    }),
  );
}

function enableResizeEvent(reader: any, dispatch: AppDispatch, id: string) {
  const resizeHandler = () => {
    setBookBoundary(reader, dispatch, id);
  };

  const debouncedResizeHandler = debounce(resizeHandler, 500);
  window.addEventListener("resize", debouncedResizeHandler, { passive: true });
}

export default function BookReader({ proxy }: ContentProps): ReactElement {
  useAuthenticated(); // redirects to login if not authenticated, required because shown as RouteWithoutLayout
  const { id = "" } = useParams<ContentParams>();
  window.bookId = id;

  const url = new URL(`/api/v1/data/content/${id}/manifest.json`, window.location.href);
  const [manifest, setManifest] = useState<WebpubManifest>();
  const [error, setError] = useState<Error | undefined>(undefined);
  const [reader, setReader] = useState<any | undefined>(undefined);
  const containerRef = useRef<HTMLDivElement>(null);
  const dispatch = useAppDispatch();
  const readerConfig = useAppSelector((state) => state.bookReader[id] || DEFAULT_BOOK_READER_CONFIG_STATE);
  const userData = useAppSelector((state) => state.userData);
  const themeName = useAppSelector((state) => state.theme);
  const [loaded, setLoaded] = useState(false);
  const theme = createTheme({
    palette: {
      mode: themeName || "light", // Switching the dark mode on is a single property value change.
    },
    breakpoints: {
      values: {
        xs: 0,
        sm: 850,
        md: 900,
        lg: 1200,
        xl: 1536,
      },
    },
  });
  useEffect(() => {
    if (userData.user.accessToken) {
      fetcher
        .fetchPlus<WebpubManifest>(url.href)
        .then((manif) => {
          setManifest(manif);
        })
        .catch((error) => {
          console.error("Error loading manifest", error);
          setError(error);
        });
    }
  }, [id, userData]);

  useEffect(() => {
    if (!proxy.loaded || !manifest) {
      return;
    }
    (async () => {
      const conf = await getRefreshedState<BookReaderState>(proxy, DEFAULT_BOOK_READER_CONFIG_STATE, id);
      dispatch(bookReaderActions.setState({ id, value: conf }));

      const userSettings = {
        verticalScroll: !!conf.isScrolling,
        appearance: getColorMode(themeName),
        fontFamily: `${conf.fontFamily},${conf.fontFamilyChinese}`,
        currentTocUrl: conf.currentTocUrl,
        location: conf.location,
        atStart: conf.atStart,
        atEnd: conf.atEnd,
        pageMargins: conf.pageMargins,
      };
      window.transcrobesStore = store;
      const reader = await D2Reader.load({
        url,
        injectables: injectables,
        injectablesFixed: [],
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
        } as any,
        userSettings: userSettings,
        api: {
          // getContent: getContent,
          updateCurrentLocation: async (loc: any) => {
            // This is needed so that setBookBoundary has the updated "reader" value.
            // dispatch({ type: "LOCATION_CHANGED", location: loc });
            dispatch(bookReaderActions.setLocationChanged({ id, value: loc }));
            return loc;
          },
          onError: function (e: Error) {
            setError(e);
          },
        } as any, // FIXME: many params seem to not be *required* here, so any...
      });
      window.etfLoaded = new Set<string>();
      setReader(reader);
      enableResizeEvent(reader, dispatch, id);
      if (readerConfig.location) {
        reader.goTo(readerConfig.location);
        // FIXME: am i necessary?
        // D2Reader.applyUserSettings({ fontSize: readerConfig.fontSize * 100 });
        D2Reader.applyUserSettings({ fontSize: 100 });
      }
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
        if (reader) {
          reader.settings.isPaginated().then((paginated: any) => {
            if (!paginated) {
              if (window.etfLoaded && window.etfLoaded.delete("loaded")) {
                // D2Reader.applyUserSettings({ fontSize: readerConfig.fontSize * 100 });
                D2Reader.applyUserSettings({ fontSize: 100 });
              }
            }
            setLoaded(true);
          });
        }
      }, 1000);
      return () => clearInterval(interval);
    })();
    return () => {
      window.etfLoaded = undefined;
      D2Reader.unload();
    };
  }, [proxy.loaded, manifest]);

  useEffect(() => {
    if (loaded) {
      D2Reader.applyUserSettings({ fontFamily: `${readerConfig.fontFamily},${readerConfig.fontFamilyChinese}` });
    }
  }, [readerConfig.fontFamily, readerConfig.fontFamilyChinese]);

  useEffect(() => {
    D2Reader.scroll(readerConfig.isScrolling);
  }, [readerConfig.isScrolling]);

  useEffect(() => {
    if (loaded) {
      D2Reader.applyUserSettings({ pageMargins: readerConfig.pageMargins });
    }
  }, [readerConfig.pageMargins]);

  // Re-calculate page location on scroll/TOC navigation/page button press
  useEffect(() => {
    if (!readerConfig.location || !reader) return;
    setBookBoundary(reader, dispatch, id);
  }, [readerConfig.location, reader, readerConfig.isScrolling, readerConfig.glossing, readerConfig.segmentation]);
  useEffect(() => {
    if (readerConfig.currentTocUrl && reader) {
      const toto = { href: readerConfig.currentTocUrl } as any;
      reader.goTo(toto);
      // D2Reader.applyUserSettings({ fontSize: readerConfig.fontSize * 100 });
      D2Reader.applyUserSettings({ fontSize: 100 });
    }
  }, [readerConfig.currentTocUrl]);

  // prev and next page functions
  const goForward = useCallback(async () => {
    if (!reader) return;
    const isLastPage = await reader.atEnd();
    reader.nextPage();
    if (isLastPage) {
      // FIXME: This will not work for links containing sub-links
      // b/c reader.nextPage saves the raw toc link without the elementID
      dispatch(bookReaderActions.setCurrentTocUrl({ id, value: reader.mostRecentNavigatedTocItem() }));
    }
  }, [reader]);

  const goBackward = useCallback(async () => {
    if (!reader) return;
    const isFirstPage = await reader.atStart();
    reader.previousPage();
    if (isFirstPage) {
      dispatch(bookReaderActions.setCurrentTocUrl({ id, value: reader.mostRecentNavigatedTocItem() }));
    }
  }, [reader]);

  const height = DEFAULT_HEIGHT;
  const growWhenScrolling = DEFAULT_SHOULD_GROW_WHEN_SCROLLING;
  const shouldGrow = readerConfig.isScrolling && growWhenScrolling;

  return (
    <StyledEngineProvider injectFirst>
      <ThemeProvider theme={theme}>
        <Box>
          {manifest && <Header manifest={manifest} />}

          <Box
            flex={"1"}
            alignItems={"stretch"}
            display="flex"
            flexDirection="column"
            position={"relative"}
            sx={{
              // color: theme.palette.getContrastText(theme.palette.background.default),
              // FIXME: this should be declared somewhere less nasty
              bgcolor: themeName === "dark" ? "#000000" : "#fff",
            }}
          >
            <div ref={containerRef} id="D2Reader-Container">
              <main
                tabIndex={-1}
                id="iframe-wrapper"
                style={{
                  /**
                   * This determines the height of the iframe.
                   *
                   * If we remove this, then in scrolling mode it simply grows to fit
                   * content. In paginated mode, however, we must have this set because
                   * we have to decide how big the content should be.
                   */
                  height: shouldGrow ? "initial" : height,
                  /**
                   * We always want the height to be at least the defined height
                   */
                  minHeight: height,
                  overflow: "hidden",
                }}
              >
                <div id="reader-loading" className="loading"></div>
                <div id="reader-error" className="error"></div>
              </main>
            </div>
          </Box>
          <Box
            component="footer"
            display="flex"
            sx={{
              bottom: 0,
              width: "100%",
              justifyContent: "space-between",
              position: "sticky",
              height: `${FOOTER_HEIGHT}px`,
              color: theme.palette.getContrastText(theme.palette.background.default),
              bgcolor: theme.palette.background.default,
            }}
          >
            <Button
              size="large"
              children={<KeyboardArrowLeftIcon />}
              label="Previous"
              onClick={goBackward}
              disabled={readerConfig.atStart}
            />
            <Button
              alignIcon="right"
              size="large"
              children={<KeyboardArrowRightIcon />}
              label="Next"
              onClick={goForward}
              disabled={readerConfig.atEnd}
            />
          </Box>
          <TokenDetails readerConfig={readerConfig} />
          <Mouseover readerConfig={readerConfig} />
          <Loading />
        </Box>
      </ThemeProvider>
    </StyledEngineProvider>
  );
}

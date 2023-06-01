import KeyboardArrowLeftIcon from "@mui/icons-material/KeyboardArrowLeft";
import KeyboardArrowRightIcon from "@mui/icons-material/KeyboardArrowRight";
import { Box, StyledEngineProvider, Theme, ThemeProvider, createTheme } from "@mui/material";
import debounce from "debounce";
import { ReactElement, useCallback, useEffect, useRef, useState } from "react";
import { Button, ThemeType, useAuthenticated, useTheme, useTranslate } from "react-admin";
import { useParams } from "react-router-dom";
import { AdminStore, AppDispatch, store } from "../../app/createStore";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import Loading from "../../components/Loading";
import Mouseover from "../../components/content/td/Mouseover";
import TokenDetails from "../../components/content/td/TokenDetails";
import { bookReaderActions } from "../../features/content/bookReaderSlice";
import { getRefreshedState } from "../../features/content/contentSlice";
import { WebpubManifest } from "../../lib/WebpubManifestTypes/WebpubManifest";
import { fetcher } from "../../lib/fetcher";
import { NAME_PREFIX, intervalCollection } from "../../lib/interval/interval-decorator";
import { getDefaultLanguageDictionaries } from "../../lib/libMethods";
import {
  BOOCROBES_HEADER_HEIGHT,
  BookReaderState,
  ContentParams,
  ContentProps,
  DEFAULT_BOOK_READER_CONFIG_STATE,
  translationProviderOrder,
} from "../../lib/types";
import D2Reader from "../../r2d2bc";
import {
  ColorMode,
  D2ColorMode,
  DEFAULT_HEIGHT,
  DEFAULT_SHOULD_GROW_WHEN_SCROLLING,
  FOOTER_HEIGHT,
} from "../common/types";
import Header from "./Header";
import injectables from "./injectables";

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
  const translate = useTranslate();
  window.bookId = id;

  const url = new URL(`/api/v1/data/content/${id}/manifest.json`, window.location.href);
  const [manifest, setManifest] = useState<WebpubManifest>();
  const [, setError] = useState<Error | undefined>(undefined);
  const [reader, setReader] = useState<D2Reader | undefined>(undefined);
  const containerRef = useRef<HTMLDivElement>(null);
  const dispatch = useAppDispatch();
  const readerConfig = useAppSelector((state) => state.bookReader[id] || DEFAULT_BOOK_READER_CONFIG_STATE);
  const user = useAppSelector((state) => state.userData.user);
  const [loaded, setLoaded] = useState(false);
  const [themeName] = useTheme();
  const [theme, setTheme] = useState<Theme>();
  useEffect(() => {
    if (themeName) {
      console.log("creating a theme from ", themeName);
      setTheme(
        createTheme({
          palette: {
            mode: (themeName as ThemeType) || "light", // Switching the dark mode on is a single property value change.
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
        }),
      );
    }
  }, [themeName]);

  useEffect(() => {
    if (user.accessToken) {
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
  }, [id, user]);

  useEffect(() => {
    return () => {
      if (reader) {
        // we only assign once, so we can remove the event listener here, as this is only on unmount
        // we might still have one in dev due to strict mode but that's fine
        reader.stop();
      }
    };
  }, [reader]);

  useEffect(() => {
    if (!proxy.loaded || !manifest) {
      return;
    }
    (async () => {
      const conf = await getRefreshedState<BookReaderState>(
        proxy,
        {
          ...DEFAULT_BOOK_READER_CONFIG_STATE,
          translationProviderOrder: translationProviderOrder(getDefaultLanguageDictionaries(user.fromLang)),
        },
        id,
      );
      dispatch(bookReaderActions.setState({ id, value: conf }));

      const userSettings = {
        verticalScroll: !!conf.isScrolling,
        appearance: getColorMode(themeName as ColorMode),
        fontFamily: `${conf.fontFamilyGloss},${conf.fontFamilyMain}`,
        currentTocUrl: conf.currentTocUrl,
        location: conf.location,
        atStart: conf.atStart,
        atEnd: conf.atEnd,
        pageMargins: conf.pageMargins,
      };
      window.transcrobesStore = store;
      console.log("Loading the reader with ", url, userSettings, conf);
      const reader = await D2Reader.load({
        url,
        injectables: injectables,
        injectablesFixed: [],
        attributes: {
          navHeight: BOOCROBES_HEADER_HEIGHT,
          margin: 0,
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
          updateCurrentLocation: async (loc: any) => {
            // This is needed so that setBookBoundary has the updated "reader" value.
            dispatch(bookReaderActions.setLocationChanged({ id, value: loc }));
            return loc;
          },
          onError: (e: Error) => {
            setError(e);
          },
        } as any, // FIXME: many params seem to not be *required* here, so any...
      });
      window.etfLoaded = new Set<string>();
      setReader(reader);
      enableResizeEvent(reader, dispatch, id);
      const curLoc = readerConfig.location || userSettings.location;
      if (curLoc) {
        reader.goTo(curLoc);
        // FIXME: am i necessary?
        reader.applyUserSettings({ fontSize: 100 });
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
      setInterval(
        () => {
          if (reader) {
            if (reader.currentSettings.verticalScroll) {
              if (window.etfLoaded && window.etfLoaded.delete("loaded")) {
                reader.applyUserSettings({ fontSize: 100 });
              }
            }
          }
          setLoaded(true);
        },
        1000,
        NAME_PREFIX + "r2d2bcHack",
      );
    })();
    return () => {
      window.etfLoaded = undefined;
      intervalCollection.removeAll();
      reader?.stop();
    };
  }, [proxy.loaded, manifest]);

  useEffect(() => {
    if (loaded && reader) {
      reader.applyUserSettings({ fontFamily: `${readerConfig.fontFamilyGloss},${readerConfig.fontFamilyMain}` });
    }
  }, [readerConfig.fontFamilyGloss, readerConfig.fontFamilyMain]);

  useEffect(() => {
    if (loaded && reader) {
      reader.scroll(readerConfig.isScrolling);
    }
  }, [readerConfig.isScrolling]);

  useEffect(() => {
    if (loaded && reader) {
      reader.applyUserSettings({ pageMargins: readerConfig.pageMargins });
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
      reader.applyUserSettings({ fontSize: 100 });
    }
  }, [readerConfig.currentTocUrl]);

  // prev and next page functions
  const goForward = useCallback(async () => {
    if (!reader) return;
    const isLastPage = reader.atEnd;
    reader.nextPage();
    if (isLastPage) {
      // FIXME: This will not work for links containing sub-links
      // b/c reader.nextPage saves the raw toc link without the elementID
      dispatch(bookReaderActions.setCurrentTocUrl({ id, value: reader.mostRecentNavigatedTocItem }));
    }
  }, [reader]);

  const goBackward = useCallback(async () => {
    if (!reader) return;
    const isFirstPage = reader.atStart;
    reader.previousPage();
    if (isFirstPage) {
      dispatch(bookReaderActions.setCurrentTocUrl({ id, value: reader.mostRecentNavigatedTocItem }));
    }
  }, [reader]);

  const height = DEFAULT_HEIGHT;
  const growWhenScrolling = DEFAULT_SHOULD_GROW_WHEN_SCROLLING;
  const shouldGrow = readerConfig.isScrolling && growWhenScrolling;

  return theme ? (
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
              // FIXME: this should be declared somewhere less nasty
              bgcolor: themeName === "dark" ? "black" : "white",
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
              bgcolor: "background.default",
            }}
          >
            <Button
              size="large"
              children={<KeyboardArrowLeftIcon />}
              label={translate("screens.boocrobes.previous")}
              onClick={goBackward}
              disabled={readerConfig.atStart}
            />
            <Button
              alignIcon="right"
              size="large"
              children={<KeyboardArrowRightIcon />}
              label={translate("screens.boocrobes.next")}
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
  ) : (
    <></>
  );
}

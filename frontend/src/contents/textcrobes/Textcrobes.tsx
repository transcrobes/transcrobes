import { StyledEngineProvider, Theme, ThemeProvider, createTheme, useMediaQuery } from "@mui/material";
import { EditorState } from "draft-js";
import { stateToHTML } from "draft-js-export-html";
import "draft-js/dist/Draft.css";
import { ReactElement, useEffect, useRef, useState } from "react";
import { ThemeType, TopToolbar, useStore, useTheme, useTranslate } from "react-admin";
import { makeStyles } from "tss-react/mui";
import { store } from "../../app/createStore";
import { useAppDispatch, useAppSelector, useJssStyles } from "../../app/hooks";
import Conftainer from "../../components/Conftainer";
import { DocumentProgress } from "../../components/DocumentProgress";
import HelpButton from "../../components/HelpButton";
import Loading from "../../components/Loading";
import WatchDemo from "../../components/WatchDemo";
import { enrichETFElements } from "../../components/content/etf/EnrichedTextFragment";
import Mouseover from "../../components/content/td/Mouseover";
import TokenDetails from "../../components/content/td/TokenDetails";
import MUIRichTextEditor from "../../components/mui-rte/MUIRichTextEditor";
import type { WebDataManager } from "../../data/types";
import { getRefreshedState } from "../../features/content/contentSlice";
import { simpleReaderActions } from "../../features/content/simpleReaderSlice";
import { setLoading } from "../../features/ui/uiSlice";
import { ensureDefinitionsLoaded } from "../../lib/dictionary";
import { isScriptioContinuo, wordIdsFromModels } from "../../lib/funclib";
import { fetchPlus, getDefaultLanguageDictionaries } from "../../lib/libMethods";
import {
  DEFAULT_TEXT_READER_CONFIG_STATE,
  DOCS_DOMAIN,
  ImportFirstSuccessStats,
  KeyedModels,
  SimpleReaderState,
  TEXTCROBES_YT_VIDEO,
  TEXT_READER_ID,
  noop,
  translationProviderOrder,
} from "../../lib/types";
import ContentConfigLauncherDrawer from "./TextReaderConfigLauncher";

type Props = {
  proxy: WebDataManager;
};
const MAX_TEXT_LENGTH = 30000;
const useStyles = makeStyles()({
  error: {
    color: "red",
    fontWeight: "bold",
    fontSize: "120%",
  },
  toolbar: {
    justifyContent: "space-between",
    alignItems: "center",
  },
});

export default function Textcrobes({ proxy }: Props): ReactElement {
  const [editorState, setEditorState] = useState(() => EditorState.createEmpty());
  const [html, setHtml] = useState("");
  const [models, setModels] = useState<KeyedModels | null>(null);
  const [stats, setStats] = useState<ImportFirstSuccessStats | null>();
  const [error, setError] = useState("");
  const [includeIgnored] = useStore("preferences.includeIgnored", false);
  const [includeNonDict] = useStore("preferences.includeNonDict", false);
  const translate = useTranslate();

  const divRef = useRef<HTMLDivElement>(null);
  const id = TEXT_READER_ID;

  const dispatch = useAppDispatch();
  const readerConfig = useAppSelector((state) => state.simpleReader[id] || DEFAULT_TEXT_READER_CONFIG_STATE);
  const fromLang = useAppSelector((state) => state.userData.user.fromLang);

  const { classes } = useStyles();
  const etfClasses = useJssStyles({ ...readerConfig, scriptioContinuo: isScriptioContinuo(fromLang) });
  const prefersDarkMode = useMediaQuery("(prefers-color-scheme: dark)");
  const [themeName] = useTheme(prefersDarkMode ? "dark" : "light");
  const [theme] = useState<Theme>(
    createTheme({
      palette: {
        mode: themeName as ThemeType, // Switching the dark mode on is a single property value change.
      },
    }),
  );

  const helpUrl = `//${DOCS_DOMAIN}/page/software/learn/textcrobes/`;
  // FIXME: this is still the way to style the editor because there is hardcoding
  // of the "overrides" property in mui-rte component.
  Object.assign(theme, {
    overrides: {
      MUIRichTextEditor: {
        placeHolder: {
          position: "relative",
        },
      },
    },
  });

  useEffect(() => {
    (async () => {
      const conf = await getRefreshedState<SimpleReaderState>(
        proxy,
        {
          ...DEFAULT_TEXT_READER_CONFIG_STATE,
          translationProviderOrder: translationProviderOrder(getDefaultLanguageDictionaries(fromLang)),
        },
        id,
      );
      dispatch(simpleReaderActions.setState({ id, value: conf }));
    })();
  }, []);

  useEffect(() => {
    setHtml("");
    setError("");
    setStats(undefined);
    const text = stateToHTML(editorState.getCurrentContent());
    if (text === "<p><br></p>") {
      dispatch(setLoading(undefined));
      return;
    }
    dispatch(setLoading(true));
    fetchPlus("api/v1/enrich/enrich_html_to_json", JSON.stringify({ data: text })).then((value) => {
      if (!value.models) {
        setError(translate("screens.textcrobes.enrich_error"));
        console.error("There was an error while enriching the text.", value);
      }
      setModels(value.models);
      const uniqueIds = wordIdsFromModels(value.models);
      ensureDefinitionsLoaded(proxy, [...uniqueIds], store).then(() => {
        setHtml(value.html);
        dispatch(setLoading(undefined));
      });
      console.log("got back a value", value);
      proxy
        .getStatsFromAnalysis({ analysisString: value.analysis, fromLang, includeIgnored, includeNonDict })
        .then((value) => setStats(value));
    });
  }, [editorState.getCurrentContent()]);

  useEffect(() => {
    if (divRef.current && models) {
      enrichETFElements(divRef.current, html, readerConfig, models, store, etfClasses);
    }
  }, [html]);

  function restrictToMaxCharacters(event: React.ClipboardEvent<HTMLDivElement>) {
    const paste = event.clipboardData.getData("text");
    const currentLength = editorState.getCurrentContent().getPlainText("").length;
    if (currentLength + paste.length > MAX_TEXT_LENGTH) {
      setError(translate("screens.textcrobes.input_label", { maxTextLength: MAX_TEXT_LENGTH }));
      event.preventDefault();
    }
  }

  return (
    <div>
      <TopToolbar className={classes.toolbar}>
        <ContentConfigLauncherDrawer
          classes={classes}
          readerConfig={readerConfig}
          actions={simpleReaderActions}
          allowMainTextOverride
        />
        <WatchDemo url={TEXTCROBES_YT_VIDEO} />
        <HelpButton url={helpUrl} />
      </TopToolbar>
      {error && <div className={classes.error}>{error}</div>}
      <div onPaste={(event) => restrictToMaxCharacters(event)}>
        <Conftainer label={translate("screens.textcrobes.input_label")} id="container">
          <StyledEngineProvider injectFirst>
            <ThemeProvider theme={theme}>
              <MUIRichTextEditor
                maxLength={MAX_TEXT_LENGTH}
                controls={[]}
                onChange={setEditorState}
                label={translate("screens.textcrobes.type_something_here")}
                onSave={noop}
              />
            </ThemeProvider>
          </StyledEngineProvider>
        </Conftainer>
      </div>
      <br />
      <div ref={divRef} />
      {stats && <DocumentProgress stats={stats} />}
      <TokenDetails readerConfig={readerConfig} />
      <Mouseover readerConfig={readerConfig} />
      <Loading position="relative" top="0px" />
    </div>
  );
}

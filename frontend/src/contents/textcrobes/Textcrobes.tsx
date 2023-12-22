import { $generateHtmlFromNodes } from "@lexical/html";
import { AutoLinkNode, LinkNode } from "@lexical/link";
import { ListItemNode, ListNode } from "@lexical/list";
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import LexicalErrorBoundary from "@lexical/react/LexicalErrorBoundary";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { LinkPlugin } from "@lexical/react/LexicalLinkPlugin";
import { ListPlugin } from "@lexical/react/LexicalListPlugin";
import { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { HeadingNode, QuoteNode } from "@lexical/rich-text";
import { TableCellNode, TableNode, TableRowNode } from "@lexical/table";
import { Theme, createTheme, useMediaQuery } from "@mui/material";
import { EditorState, LexicalEditor } from "lexical";
import { ReactElement, useEffect, useRef, useState } from "react";
import { ThemeType, TopToolbar, useStore, useTheme, useTranslate } from "react-admin";
import { makeStyles } from "tss-react/mui";
import { platformHelper, store } from "../../app/createStore";
import { useAppDispatch, useAppSelector, useJssStyles } from "../../app/hooks";
import Conftainer from "../../components/Conftainer";
import { DocumentProgress } from "../../components/DocumentProgress";
import HelpButton from "../../components/HelpButton";
import Loading from "../../components/Loading";
import WatchDemo from "../../components/WatchDemo";
import { enrichETFElements } from "../../components/content/etf/EnrichedTextFragment";
import Mouseover from "../../components/content/td/Mouseover";
import TokenDetails from "../../components/content/td/TokenDetails";
import { MaxLengthPlugin } from "../../components/lexical/MaxLengthPlugin";
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
  EDITOR_EMPTY_HTML,
  ImportFirstSuccessStats,
  KeyedModels,
  MCQA,
  SimpleReaderState,
  TEXTCROBES_YT_VIDEO,
  TEXT_READER_ID,
  translationProviderOrder,
} from "../../lib/types";
import RichMCQuestion from "../questions/RichMCQuestion";
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

function onError(error: Error) {
  console.error(error);
}
export default function Textcrobes({ proxy }: Props): ReactElement {
  const [html, setHtml] = useState("");
  const [models, setModels] = useState<KeyedModels | null>(null);
  const [stats, setStats] = useState<ImportFirstSuccessStats | null>();
  const [error, setError] = useState("");
  const [includeIgnored] = useStore("preferences.includeIgnored", false);
  const [includeNonDict] = useStore("preferences.includeNonDict", false);
  const [qas, setQAs] = useState<MCQA[] | undefined>(undefined);
  const translate = useTranslate();
  const user = useAppSelector((state) => state.userData.user);
  const divRef = useRef<HTMLDivElement>(null);
  const id = TEXT_READER_ID;
  const dispatch = useAppDispatch();
  const readerConfig = useAppSelector((state) => state.simpleReader[id] || DEFAULT_TEXT_READER_CONFIG_STATE);
  const fromLang = useAppSelector((state) => state.userData.user.fromLang);
  const { classes } = useStyles();
  const etfClasses = useJssStyles({ ...readerConfig, scriptioContinuo: isScriptioContinuo(fromLang) });
  // const prefersDarkMode = useMediaQuery("(prefers-color-scheme: dark)");
  // const [themeName] = useTheme(prefersDarkMode ? "dark" : "light");
  // const [theme] = useState<Theme>(
  //   createTheme({
  //     palette: {
  //       mode: themeName as ThemeType, // Switching the dark mode on is a single property value change.
  //     },
  //   }),
  // );

  const initialConfig = {
    namespace: "textcrobes",
    theme: {},
    onError,
    nodes: [
      HeadingNode,
      ListNode,
      ListItemNode,
      QuoteNode,
      TableNode,
      TableCellNode,
      TableRowNode,
      AutoLinkNode,
      LinkNode,
    ],
  };
  const helpUrl = `//${DOCS_DOMAIN}/page/software/learn/textcrobes/`;
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
    if (divRef.current && models) {
      enrichETFElements(divRef.current, html, readerConfig, models, store, etfClasses, id, "/textcrobes");
    }
  }, [html]);

  function onChange(_: EditorState, editor: LexicalEditor) {
    editor.update(() => {
      setHtml("");
      setError("");
      setQAs(undefined);
      setStats(undefined);
      const text = $generateHtmlFromNodes(editor, null);
      if (text === EDITOR_EMPTY_HTML) {
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
        proxy
          .getStatsFromAnalysis({ analysisString: value.analysis, fromLang, includeIgnored, includeNonDict })
          .then((value) => setStats(value));
      });
    });
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
      <Conftainer label={translate("screens.textcrobes.input_label")} id="container">
        <LexicalComposer initialConfig={initialConfig}>
          <RichTextPlugin
            contentEditable={<ContentEditable style={{ minHeight: "50px", textAlign: "left", paddingLeft: "20px" }} />}
            placeholder={
              <div style={{ position: "absolute", top: "24px" }}>
                {translate("screens.textcrobes.type_something_here")}
              </div>
            }
            ErrorBoundary={LexicalErrorBoundary}
          />
          <HistoryPlugin />
          <OnChangePlugin onChange={onChange} ignoreSelectionChange />
          <LinkPlugin />
          <ListPlugin />
          <MaxLengthPlugin maxLength={MAX_TEXT_LENGTH} />
        </LexicalComposer>
      </Conftainer>
      <br />
      <div ref={divRef} />
      {user.modelEnabled && (
        <>
          {/* {(qas || []).length === 0 && html && html.length > minQAGCharLength(fromLang) && (
            <Box>
              <Button size="small" onClick={handleGenerateQA} startIcon={<QuestionAnswerIcon />}>
                {translate("screens.textcrobes.generate_mcq")}
              </Button>
            </Box>
          )} */}
          {qas &&
            qas.map((qa) => (
              <RichMCQuestion
                key={qa.question}
                submitAnswer={(studentAnswer, isCorrect) => {
                  platformHelper.saveAnswer({
                    questionId: qa.id,
                    studentAnswer,
                    isCorrect,
                  });
                }}
                models={models}
                mcqa={qa}
                readerConfig={readerConfig}
                autoSubmit={true}
              />
            ))}
        </>
      )}
      {stats && <DocumentProgress stats={stats} />}
      <TokenDetails readerConfig={readerConfig} />
      <Mouseover readerConfig={readerConfig} />
      <Loading />
    </div>
  );
}

import { createTheme, makeStyles, ThemeProvider } from "@material-ui/core";
import { EditorState } from "draft-js";
import { stateToHTML } from "draft-js-export-html";
import "draft-js/dist/Draft.css";
import _ from "lodash";
import MUIRichTextEditor from "mui-rte";
import { ReactElement, useEffect, useRef, useState } from "react";
import { TopToolbar } from "react-admin";
import { store } from "../../app/createStore";
import { useAppDispatch, useAppSelector, useJssStyles } from "../../app/hooks";
import Conftainer from "../../components/Conftainer";
import { enrichETFElements } from "../../components/content/etf/EnrichedTextFragment";
import Mouseover from "../../components/content/td/Mouseover";
import TokenDetails from "../../components/content/td/TokenDetails";
import HelpButton from "../../components/HelpButton";
import Loading from "../../components/Loading";
import {
  DEFAULT_TEXT_READER_CONFIG_STATE,
  simpleReaderActions,
  SimpleReaderState,
  TEXT_READER_ID,
} from "../../features/content/simpleReaderSlice";
import { addDefinitions } from "../../features/definition/definitionsSlice";
import { setLoading } from "../../features/ui/uiSlice";
import { ImportProgress } from "../../imports/ImportProgress";
import { wordIdsFromModels } from "../../lib/funclib";
import { ServiceWorkerProxy } from "../../lib/proxies";
import {
  ContentConfigType,
  DefinitionType,
  EnrichedHtmlModels,
  ImportFirstSuccessStats,
  KeyedModels,
  noop,
} from "../../lib/types";
import ContentConfigLauncherDrawer from "./TextReaderConfigLauncher";

type Props = {
  proxy: ServiceWorkerProxy;
};
const MAX_TEXT_LENGTH = 30000;
const DATA_SOURCE = "Textcrobes.tsx";
const useStyles = makeStyles({
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
  const [stats, setStats] = useState<ImportFirstSuccessStats>();
  const [error, setError] = useState("");

  const divRef = useRef<HTMLDivElement>(null);
  const id = TEXT_READER_ID;

  const dispatch = useAppDispatch();
  const readerConfig = useAppSelector((state) => state.simpleReader[id] || DEFAULT_TEXT_READER_CONFIG_STATE);
  const themeName = useAppSelector((state) => state.theme);

  const classes = useStyles();
  const etfClasses = useJssStyles(readerConfig);

  const theme = createTheme({
    palette: {
      type: themeName || "light", // Switching the dark mode on is a single property value change.
    },
  });

  const helpUrl = "https://transcrob.es/page/software/learn/textcrobes/";
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
      if (proxy.loaded) {
        const config = await proxy.sendMessagePromise<ContentConfigType>({
          source: "ContentConfig.ts",
          type: "getContentConfigFromStore",
          value: id,
        });
        const conf: SimpleReaderState = _.merge(
          _.cloneDeep({ ...DEFAULT_TEXT_READER_CONFIG_STATE, id }),
          config?.configString ? JSON.parse(config.configString).readerState : null,
        );

        dispatch(simpleReaderActions.setState({ id, value: conf }));
      }
    })();
  }, [proxy.loaded]);

  useEffect(() => {
    setHtml("");
    setError("");
    setStats(undefined);
    const text = stateToHTML(editorState.getCurrentContent());
    if (text === "<p><br></p>") {
      dispatch(setLoading(undefined));
      return;
    }
    if (!proxy.loaded) return;
    dispatch(setLoading(true));
    proxy
      .sendMessagePromise<EnrichedHtmlModels>({
        source: DATA_SOURCE,
        type: "enrichHtmlText",
        value: text,
      })
      .then((value) => {
        setModels(value.models);
        const uniqueIds = wordIdsFromModels(value.models);
        proxy
          .sendMessagePromise<DefinitionType[]>({
            source: DATA_SOURCE,
            type: "getByIds",
            value: { collection: "definitions", ids: [...uniqueIds] },
          })
          .then((definitions) => {
            dispatch(
              addDefinitions(
                definitions.map((def) => {
                  return { ...def, glossToggled: false };
                }),
              ),
            );

            setHtml(value.html);
            dispatch(setLoading(undefined));
          });
        proxy
          .sendMessagePromise<ImportFirstSuccessStats>({
            source: DATA_SOURCE,
            type: "getFirstSuccessStatsForImport",
            value: { analysisString: value.analysis },
          })
          .then((locStats) => setStats(locStats));
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
      setError(
        `The editor has a character limit of ${MAX_TEXT_LENGTH}. Please delete text before adding more.
        If your text is longer than this, please put the text content in a .txt file in plain text format
        and import using the import system.`,
      );
      event.preventDefault();
    }
  }

  return (
    <div>
      <TopToolbar className={classes.toolbar}>
        <ContentConfigLauncherDrawer classes={classes} readerConfig={readerConfig} actions={simpleReaderActions} />
        <HelpButton url={helpUrl} />
      </TopToolbar>
      {error && <div className={classes.error}>{error}</div>}
      <div onPaste={(event) => restrictToMaxCharacters(event)}>
        <Conftainer label="Text to Transcrobe" id="container">
          <ThemeProvider theme={theme}>
            <MUIRichTextEditor
              maxLength={MAX_TEXT_LENGTH}
              controls={[]}
              onChange={setEditorState}
              label="Type something here..."
              onSave={noop}
            />
          </ThemeProvider>
        </Conftainer>
      </div>
      <br />
      <div ref={divRef} />
      {stats && <ImportProgress stats={stats} />}
      <TokenDetails readerConfig={readerConfig} />
      <Mouseover readerConfig={readerConfig} />
      <Loading position="relative" top="0px" />
    </div>
  );
}

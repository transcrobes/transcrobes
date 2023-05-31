import { createTheme, ScopedCssBaseline, ThemeProvider } from "@mui/material";
import { createComponentVNode, render } from "inferno";
import { Provider as InfernoProvider } from "inferno-redux";
import jss from "jss";
import preset from "jss-preset-default";
import _ from "lodash";
import rangy from "rangy";
import { I18nContextProvider } from "react-admin";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "react-query";
import { Provider } from "react-redux";
import { AdminStore, store } from "../app/createStore";
import { ETFStyles, ETFStylesProps } from "../components/Common";
import EnrichedTextFragment from "../components/content/etf/EnrichedTextFragment";
import Mouseover from "../components/content/td/Mouseover";
import TokenDetails from "../components/content/td/TokenDetails";
import Loading from "../components/Loading";
import { setCardWordsState } from "../features/card/knownCardsSlice";
import { getRefreshedState } from "../features/content/contentSlice";
import { extensionReaderActions } from "../features/content/extensionReaderSlice";
import { addModelsToState } from "../features/stats/statsSlice";
import { setLoading, setTokenDetails } from "../features/ui/uiSlice";
import { setUser } from "../features/user/userSlice";
import { popupDarkTheme, popupLightTheme } from "../layout/themes";
import { sessionActivityUpdate, submitActivity } from "../lib/componentMethods";
import { ensureDefinitionsLoaded, refreshDictionaries } from "../lib/dictionary";
import { getLanguageFromPreferred, isScriptioContinuo, missingWordIdsFromModels, toEnrich, UUID } from "../lib/funclib";
import { NAME_PREFIX } from "../lib/interval/interval-decorator";
import {
  enrichNodes,
  getDefaultLanguageDictionaries,
  getI18nProvider,
  streamingSite,
  textNodes,
} from "../lib/libMethods";
import { AbstractWorkerProxy, BackgroundWorkerProxy, setPlatformHelper } from "../lib/proxies";
import { observerFunc } from "../lib/stats";
import {
  ComponentClass,
  ComponentFunction,
  DEBOUNCE_SELECTION_MS,
  DEFAULT_EXTENSION_READER_CONFIG_STATE,
  EXTENSION_READER_ID,
  ExtensionReaderState,
  KeyedModels,
  ModelType,
  SerialisableDayCardWords,
  SerialisableStringSet,
  translationProviderOrder,
  UserState,
} from "../lib/types";
import ContentAnalysisAccuracyBrocrobes from "./ContentAnalysisAccuracyBrocrobes";
import ContentAnalysisBrocrobes from "./ContentAnalysisBrocrobes";
import { streamOverrides } from "./streaming";
import VideoPlayerScreen from "./VideoPlayerScreen";

const DATA_SOURCE = "content.ts";
const KEEPALIVE_QUERY_FREQUENCY_MS = 5000;
const id = EXTENSION_READER_ID;
const knownWords: SerialisableStringSet = {};
const knownChars: SerialisableStringSet = {};
const proxy = new BackgroundWorkerProxy();
const models: KeyedModels = {};
const queryClient = new QueryClient();
const streamingSiteName = streamingSite(location.href);
const sessionId = UUID().toString();

let classes: ETFStylesProps["classes"] | null = null;

const transcroberObserver: IntersectionObserver = new IntersectionObserver(onEntryId, {
  threshold: [0.9],
});

const getReaderConfig = () => readerConfig;
const getKnownCards = () => store.getState().knownCards;
const fromLang = () => store.getState().userData.user.fromLang;

setPlatformHelper(proxy);
const userData = await proxy.sendMessagePromise<UserState>({ source: DATA_SOURCE, type: "getUser" });
await proxy.asyncInit({ username: userData.username });
await ensureConfLoaded(store);

const readerConfig = store.getState().extensionReader[id];

const locale = !!userData.username ? readerConfig.locale : getLanguageFromPreferred(navigator.languages);
const i18nProvider = getI18nProvider(locale);

createRoot(document.body.appendChild(document.createElement("div"))!).render(
  <Provider store={store}>
    <Loading
      position="fixed"
      messageSx={
        streamingSiteName
          ? {
              color: "black",
              textShadow: `-1px -1px 0 #ffffff, 1px -1px 0 #ffffff, -1px 1px 0 #ffffff, 1px 1px 0 #ffffff,
                -2px 0 0 #ffffff, 2px 0 0 #ffffff, 0 2px 0 #ffffff, 0 -2px 0 #ffffff;`,
            }
          : undefined
      }
      message={i18nProvider.translate(
        streamingSiteName ? "screens.extension.streamer.looking_for_subs" : "screens.extension.waiting_for_load",
      )}
    />
  </Provider>,
);
store.dispatch(setLoading(true));
await ensureRestLoaded(proxy, store);

const readObserver = new IntersectionObserver(observerFunc(getReaderConfig, models, getKnownCards), {
  threshold: [1.0],
});

window.getTimestamp = () => {
  const now = Date.now();
  if (window.lastTimestamp && window.lastTimestamp > now) {
    window.lastTimestamp += 1;
  } else {
    window.lastTimestamp = now;
  }
  return window.lastTimestamp;
};

sessionActivityUpdate(proxy, sessionId);

async function ensureConfLoaded(store: AdminStore) {
  const conf = await getRefreshedState<ExtensionReaderState>(
    proxy,
    {
      ...DEFAULT_EXTENSION_READER_CONFIG_STATE,
      translationProviderOrder: translationProviderOrder(getDefaultLanguageDictionaries(fromLang())),
    },
    id,
  );
  store.dispatch(extensionReaderActions.setState({ id, value: conf }));
}

async function ensureRestLoaded(platformHelper: AbstractWorkerProxy, store: AdminStore) {
  const value = await platformHelper.sendMessagePromise<SerialisableDayCardWords>({
    source: DATA_SOURCE,
    type: "getSerialisableCardWords",
    value: "",
  });
  store.dispatch(setCardWordsState(value));
  for (const word of Object.keys(value.knownCardWordGraphs)) {
    if (toEnrich(word, fromLang())) {
      knownWords[word] = null;
    }
    if (fromLang() === "zh-Hans") {
      for (const char of word) {
        if (toEnrich(char, fromLang())) {
          knownChars[char] = null;
        }
      }
    }
  }

  await refreshDictionaries(store, platformHelper, fromLang());
}

if (!userData.username || !userData.password || !userData.baseUrl) {
  // This should never be possible now, as the click on the extension action checks and redirects to the conf page
  store.dispatch(setLoading(undefined));
  alert(i18nProvider.translate("screens.extension.missing_account", { docs_domain: DOCS_DOMAIN }));
  throw new Error("Unable to find the current username");
}
// FIXME: it is DANGEROUS to use this here, as the async thunks do get and set dexie!!!
store.dispatch(setUser(userData));

document.addEventListener("click", () => {
  store.dispatch(setTokenDetails(undefined));
});

jss.setup(preset());
classes = jss
  .createStyleSheet(ETFStyles, { link: true })
  .attach()
  .update({ ...readerConfig, scriptioContinuo: isScriptioContinuo(userData.user.fromLang) }).classes;

const baseTheme = readerConfig.themeName === "dark" ? popupDarkTheme : popupLightTheme;
let themeConfig: any = baseTheme;

if (streamingSiteName) {
  themeConfig = {
    ...baseTheme,
    components: { ...baseTheme.components, ...streamOverrides.components },
    typography: { ...baseTheme.typography, ...streamOverrides.typography },
  };
}

createRoot(document.body.appendChild(document.createElement("div"))!).render(
  <Provider store={store}>
    <ThemeProvider theme={createTheme({ ...themeConfig })}>
      <I18nContextProvider value={i18nProvider}>
        <ScopedCssBaseline>
          {!!streamingSiteName ? (
            // FIXME: find out why the queryclientprovider is necessary...
            <QueryClientProvider client={queryClient}>
              <VideoPlayerScreen proxy={proxy} />
            </QueryClientProvider>
          ) : (
            <>
              <TokenDetails readerConfig={readerConfig} />
              <Mouseover readerConfig={readerConfig} />
            </>
          )}
          {readerConfig.analysisPosition !== "none" && <ContentAnalysisBrocrobes />}
          {userData.showResearchDetails && <ContentAnalysisAccuracyBrocrobes proxy={proxy} />}
        </ScopedCssBaseline>
      </I18nContextProvider>
    </ThemeProvider>
  </Provider>,
);

submitActivity(proxy, "start", "extension", window.location.href, sessionId, window.getTimestamp);

// This ensures that when the transcrobed tab has focus, the background script will
// be active or reactivated if unloaded (which happens regularly)
setInterval(
  () => {
    if (document.visibilityState === "visible") {
      proxy.sendMessagePromise({ source: DATA_SOURCE, type: "getWordFromDBs", value: "的" });
      submitActivity(proxy, "continue", "extension", window.location.href, sessionId, window.getTimestamp);
    }
  },
  KEEPALIVE_QUERY_FREQUENCY_MS,
  NAME_PREFIX + "contentKeepAlive",
);

window.addEventListener("beforeunload", () => {
  submitActivity(proxy, "end", "extension", window.location.href, sessionId, window.getTimestamp);
});

export function onEntryId(entries: IntersectionObserverEntry[]): void {
  if (entries.length === 0) return;
  const loading = store.getState().ui.loading;

  entries.forEach((change) => {
    const element = change.target as HTMLElement;
    if (!change.isIntersecting) return;
    if (element.dataset && element.dataset.tced) return;
    change.target.childNodes.forEach(async (item) => {
      if (item.nodeType === 3 && item.nodeValue?.trim() && toEnrich(item.nodeValue, fromLang())) {
        const [data] = await proxy.sendMessagePromise<[ModelType, string]>({
          source: DATA_SOURCE,
          type: "enrichText",
          value: item.nodeValue,
        });
        if (!data.id) {
          return;
        }
        models[data.id.toString()] = data;
        const uniqueIds = missingWordIdsFromModels({ [data.id.toString()]: data }, store.getState().definitions);

        if (readerConfig.analysisPosition !== "none") {
          store.dispatch(
            addModelsToState({
              model: data,
              knownWords,
              knownChars,
              fromLang: fromLang(),
            }),
          );
        }
        if (uniqueIds.size > 0) {
          await ensureDefinitionsLoaded(proxy, [...uniqueIds], store);
        }
        if (loading) store.dispatch(setLoading(undefined));
        const etf = document.createElement("span");
        etf.id = data.id.toString();
        item.replaceWith(etf);
        readObserver.observe(etf);
        if (classes) {
          render(
            createComponentVNode(ComponentClass, InfernoProvider, {
              store: store,
              children: [
                createComponentVNode(
                  ComponentFunction,
                  EnrichedTextFragment,
                  {
                    readerConfig: readerConfig,
                    model: data,
                    classes,
                  },
                  null,
                  {
                    onComponentWillUnmount() {
                      readObserver.unobserve(etf);
                    },
                  },
                ),
              ],
            }),
            etf,
          );
        }
        (etf.dataset as any).tced = "true";
      }
    });
  });
}

function runEnrich() {
  if (typeof rangy?.getSelection !== "function") {
    console.error("Rangy has not loaded properly, just transcrobing the whole page", JSON.stringify(rangy));
    enrichNodes(textNodes(document.body), transcroberObserver, userData.user.fromLang);
  } else {
    const asel = rangy.getSelection();
    if (asel?.type === "Range" && !asel.isCollapsed) {
      function doSelection() {
        const sel = rangy.getSelection();
        if (sel?.type === "Range" && !sel.isCollapsed) {
          store.dispatch(setLoading(true));
          enrichNodes(sel.getRangeAt(0).getNodes([Node.TEXT_NODE]), transcroberObserver, userData.user.fromLang);
        }
      }
      doSelection();
      const debouncedSelection = _.debounce(doSelection, DEBOUNCE_SELECTION_MS);
      document.addEventListener("selectionchange", () => {
        debouncedSelection();
      });
    } else {
      enrichNodes(textNodes(document.body), transcroberObserver, userData.user.fromLang);
    }
  }
}

if (!streamingSiteName) {
  // FIXME: this is a failed attempt to get rangy to work properly ;-(
  // it appears to have missing methods before the load event happens, and for some pages that never fires
  // (when a resource never times out or loads...)
  if (document.readyState === "complete" || typeof rangy?.getSelection === "function") {
    runEnrich();
  } else {
    document.addEventListener("readystatechange", () => {
      if (document.readyState === "complete") {
        runEnrich();
      }
    });
  }
}

import { createComponentVNode, render } from "inferno";
import { Provider as InfernoProvider } from "inferno-redux";
import jss from "jss";
import preset from "jss-preset-default";
import _ from "lodash";
import ReactDOM from "react-dom";
import { Provider } from "react-redux";
import { AdminStore, store } from "../app/createStore";
import { ETFStyles, ETFStylesProps } from "../components/Common";
import EnrichedTextFragment from "../components/content/etf/EnrichedTextFragment";
import Mouseover from "../components/content/td/Mouseover";
import TokenDetails from "../components/content/td/TokenDetails";
import Loading from "../components/Loading";
import { observerFunc } from "../lib/stats";
import { setState } from "../features/card/knownCardsSlice";
import {
  DEFAULT_WEB_READER_CONFIG_STATE,
  simpleReaderActions,
  SimpleReaderState,
  WEB_READER_ID,
} from "../features/content/simpleReaderSlice";
import { addDefinitions } from "../features/definition/definitionsSlice";
import { setLoading, setTokenDetails } from "../features/ui/uiSlice";
import { setUser } from "../features/user/userSlice";
import { missingWordIdsFromModels } from "../lib/funclib";
import { enrichChildren, toEnrich } from "../lib/libMethods";
import { AbstractWorkerProxy, BackgroundWorkerProxy, setPlatformHelper } from "../lib/proxies";
import {
  ComponentClass,
  ComponentFunction,
  ContentConfigType,
  DefinitionState,
  DefinitionType,
  KeyedModels,
  ModelType,
  ReaderState,
  SerialisableDayCardWords,
  UserState,
} from "../lib/types";

const DATA_SOURCE = "content.ts";

const transcroberObserver: IntersectionObserver = new IntersectionObserver(onEntryId, {
  threshold: [0.9],
});

ReactDOM.render(
  <Provider store={store}>
    <Loading position="fixed" />
  </Provider>,
  document.body.appendChild(document.createElement("div")),
);
store.dispatch(setLoading(true));

const models: KeyedModels = {};
let readerConfig: ReaderState;
const getReaderConfig = () => readerConfig;
const getKnownCards = () => store.getState().knownCards;
const readObserver = new IntersectionObserver(observerFunc(getReaderConfig, models, getKnownCards), {
  threshold: [1.0],
});

const platformHelper = new BackgroundWorkerProxy();
setPlatformHelper(platformHelper);

let classes: ETFStylesProps["classes"] | null = null;
const id = WEB_READER_ID;

async function ensureAllLoaded(platformHelper: AbstractWorkerProxy, store: AdminStore) {
  const config = await platformHelper.sendMessagePromise<ContentConfigType>({
    source: "ContentConfig.ts",
    type: "getContentConfigFromStore",
    value: id,
  });
  const conf: SimpleReaderState = _.merge(
    _.cloneDeep({ ...DEFAULT_WEB_READER_CONFIG_STATE, id }),
    config?.configString ? JSON.parse(config.configString).readerState : null,
  );
  store.dispatch(simpleReaderActions.setState({ id, value: conf }));

  const value = await platformHelper.sendMessagePromise<SerialisableDayCardWords>({
    source: DATA_SOURCE,
    type: "getSerialisableCardWords",
    value: "",
  });
  store.dispatch(setState(value));
}

platformHelper.sendMessagePromise<UserState>({ source: DATA_SOURCE, type: "getUser", value: "" }).then((userData) => {
  if (!userData.username || !userData.password || !userData.baseUrl) {
    store.dispatch(setLoading(undefined));
    alert(
      `You need an account on a Transcrobes server to Transcrobe a page. \n\n If you have an account please fill in the options page (right-click on the Transcrobe Me! icon -> Extension Options) with your login information (username, password, server URL).\n\n See the Transcrobes site https://transcrob.es for more information`,
    );
    throw new Error("Unable to find the current username");
  }
  // FIXME: it is DANGEROUS to use this here, as the async thunks do get and set dexie!!!
  store.dispatch(setUser(userData));

  platformHelper.asyncInit({ username: userData.username }).then(() => {
    ensureAllLoaded(platformHelper, store).then(() => {
      readerConfig = store.getState().simpleReader[id];
      enrichChildren(document.body, transcroberObserver, userData.user.fromLang || "zh-Hans");
      document.addEventListener("click", () => {
        store.dispatch(setTokenDetails(undefined));
      });

      jss.setup(preset());
      classes = jss.createStyleSheet(ETFStyles, { link: true }).attach().update(readerConfig).classes;

      ReactDOM.render(
        <Provider store={store}>
          <TokenDetails readerConfig={readerConfig} />
          <Mouseover readerConfig={readerConfig} />
        </Provider>,
        document.body.appendChild(document.createElement("div")),
      );
    });
  });
  // This ensures that when the transcrobed tab has focus, the background script will
  // be active or reactivated if unloaded (which happens regularly)
  setInterval(() => {
    platformHelper.sendMessagePromise({ source: DATA_SOURCE, type: "getWordFromDBs", value: "的" });
  }, 5000);
});

export function onEntryId(entries: IntersectionObserverEntry[]): void {
  if (entries.length === 0) return;
  const fromLang = store.getState().userData.user.fromLang;
  const loading = store.getState().ui.loading;

  entries.forEach((change) => {
    const element = change.target as HTMLElement;
    if (!change.isIntersecting) return;
    if (element.dataset && element.dataset.tced) return;
    change.target.childNodes.forEach(async (item) => {
      if (item.nodeType === 3 && item.nodeValue?.trim() && toEnrich(item.nodeValue, fromLang || "zh-Hans")) {
        const [data] = await platformHelper.sendMessagePromise<[ModelType, string]>({
          source: DATA_SOURCE,
          type: "enrichText",
          value: item.nodeValue,
        });
        if (!data.id) {
          return;
        }
        models[data.id.toString()] = data;
        const uniqueIds = missingWordIdsFromModels({ [data.id.toString()]: data }, store.getState().definitions);
        if (uniqueIds.size > 0) {
          // FIXME: how much does a setLoading cost?
          if (loading) store.dispatch(setLoading(undefined));

          const newDefinitions = await platformHelper.sendMessagePromise<DefinitionType[]>({
            source: DATA_SOURCE,
            type: "getByIds",
            value: { collection: "definitions", ids: [...uniqueIds] },
          });
          const defStates = new Map<string, DefinitionState>();
          const l = newDefinitions.length;
          for (let i = 0; i < l; i++) {
            defStates.set(newDefinitions[i].id.toString(), {
              ...newDefinitions[i],
              glossToggled: false,
            });
          }
          store.dispatch(addDefinitions([...defStates.values()]));
        }
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
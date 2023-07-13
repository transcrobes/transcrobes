import { createComponentVNode, render } from "inferno";
import { Provider as InfernoProvider } from "inferno-redux";
import jss from "jss";
import preset from "jss-preset-default";
import watch from "redux-watch";
import { ETFStyles } from "../../components/Common";
import EnrichedTextFragment from "../../components/content/etf/EnrichedTextFragment";
import { setLoading, setTokenDetails } from "../../features/ui/uiSlice";
import { sessionActivityUpdate } from "../../lib/componentMethods";
import { ensureDefinitionsLoaded } from "../../lib/dictionary";
import { isScriptioContinuo, missingWordIdsFromModels, tokensInModel } from "../../lib/funclib";
import { setPlatformHelper } from "../../lib/proxies";
import { observerFunc } from "../../lib/stats";
import { ComponentClass, ComponentFunction, KeyedModels } from "../../lib/types";

declare global {
  interface Window {
    transcrobesModel: KeyedModels;
  }
}

console.debug("Loading readium.tsx");

const MAX_TOKENS_FOR_PRE_ENRICHMENT = 30000;

const proxy = window.parent.componentsConfig.proxy;
const store = window.parent.transcrobesStore;
const bookId = window.parent.bookId;
const sessionId = window.parent.asessionId;
const readerConfig = store.getState().bookReader[bookId];
const currentModels = window.transcrobesModel;
const definitions = store.getState().definitions;

const getReaderConfig = () => readerConfig;
const getKnownCards = () => store.getState().knownCards;
const user = store.getState().userData.user;
const readObserver = new IntersectionObserver(
  observerFunc(currentModels, getReaderConfig, getKnownCards, window.parent.onScreenModels),
  {
    threshold: [1.0],
  },
);

document.addEventListener("click", () => {
  store.dispatch(setTokenDetails(undefined));
});

sessionActivityUpdate(proxy, sessionId);

store.dispatch(setLoading(true));

// this can't be done with a hook, so just doing it like this
jss.setup(preset());
const sheet = jss.createStyleSheet(ETFStyles, { link: true }).attach();
sheet.update({ ...readerConfig, scriptioContinuo: isScriptioContinuo(user.fromLang) }).classes;

const classes = sheet.classes;

setPlatformHelper(proxy);

export function onEntryId(entries: IntersectionObserverEntry[]): void {
  if (store.getState().ui.loading) {
    store.dispatch(setLoading(undefined));
  }
  entries.forEach((change) => {
    const etf = change.target as HTMLElement;
    if (!change.isIntersecting || etf.dataset.tced === "true") return;
    etf.innerHTML = "";
    readObserver.observe(etf);
    render(
      createComponentVNode(ComponentClass, InfernoProvider, {
        store,
        children: [
          createComponentVNode(
            ComponentFunction,
            EnrichedTextFragment,
            {
              elementIds: window.parent.elementIds,
              readerConfig: readerConfig,
              model: currentModels[etf.id],
              classes: classes,
            },
            null,
            {
              onComponentWillUnmount() {
                readObserver.unobserve(etf);
                window.parent.onScreenModels.delete(etf.id);
              },
            },
          ),
        ],
      }),
      etf,
    );
    etf.dataset.tced = "true";
    if (window.parent.etfLoaded) {
      window.parent.etfLoaded.add("loaded");
    }
  });
}
const transcroberObserver: IntersectionObserver = new IntersectionObserver(onEntryId, {
  threshold: [0.9],
});

// make sure the stylesheet is updated when the config values change
let w = watch(store.getState, "bookReader");
store.subscribe(
  w((newVal) => {
    sheet.update({ ...newVal[bookId], scriptioContinuo: isScriptioContinuo(user.fromLang) });
  }),
);

const uniqueIds = missingWordIdsFromModels(currentModels, definitions);
ensureDefinitionsLoaded(proxy, [...uniqueIds], store).then(() => {
  if (tokensInModel(currentModels) > MAX_TOKENS_FOR_PRE_ENRICHMENT) {
    for (const etf of document.getElementsByTagName("enriched-text-fragment")) {
      if (!etf.id) continue;
      transcroberObserver.observe(etf);
    }
  } else {
    for (const etf of document.getElementsByTagName("enriched-text-fragment") as HTMLCollectionOf<HTMLElement>) {
      if (!etf.id) continue;
      etf.innerHTML = "";
      readObserver.observe(etf);
      currentModels[etf.id]!.id = parseInt(etf.id);
      render(
        createComponentVNode(ComponentClass, InfernoProvider, {
          store: store,
          children: [
            createComponentVNode(
              ComponentFunction,
              EnrichedTextFragment,
              {
                elementIds: window.parent.elementIds,
                readerConfig: readerConfig,
                model: currentModels[etf.id],
                classes: classes,
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
      etf.dataset.tced = "true";
    }
  }
  if (window.parent.etfLoaded) {
    window.parent.etfLoaded.add("loaded");
  }
  console.debug("Finished setting up elements for readium");
});

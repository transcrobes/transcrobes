import { createComponentVNode, render } from "inferno";
import { Provider as InfernoProvider } from "inferno-redux";
import jss from "jss";
import preset from "jss-preset-default";
import ReactDOM from "react-dom";
import { Provider } from "react-redux";
import { ETFStyles } from "../../components/Common";
import EnrichedTextFragment from "../../components/content/etf/EnrichedTextFragment";
import ETFStyleUpdater from "../../components/content/td/ETFStyleUpdater";
import { setLoading, setTokenDetails } from "../../features/ui/uiSlice";
import { ensureDefinitionsLoaded } from "../../lib/dictionary";
import { missingWordIdsFromModels, tokensInModel } from "../../lib/funclib";
import { setPlatformHelper } from "../../lib/proxies";
import { observerFunc } from "../../lib/stats";
import { ComponentClass, ComponentFunction, KeyedModels } from "../../lib/types";

declare global {
  interface Window {
    transcrobesModel: KeyedModels;
  }
}

const MAX_TOKENS_FOR_PRE_ENRICHMENT = 30000;

const proxy = window.parent.componentsConfig.proxy;
const store = window.parent.transcrobesStore;
const bookId = window.parent.bookId;
const readerConfig = store.getState().bookReader[bookId];
const currentModels = window.transcrobesModel;
const definitions = store.getState().definitions;

const getReaderConfig = () => readerConfig;
const getKnownCards = () => store.getState().knownCards;
const readObserver = new IntersectionObserver(observerFunc(getReaderConfig, currentModels, getKnownCards), {
  threshold: [1.0],
});

document.addEventListener("click", () => {
  store.dispatch(setTokenDetails(undefined));
});

store.dispatch(setLoading(true));

// this can't be done with a hook, so just doing it like this
jss.setup(preset());
const sheet = jss.createStyleSheet(ETFStyles, { link: true }).attach();
sheet.update(readerConfig);
const classes = sheet.classes;

export function onEntryId(entries: IntersectionObserverEntry[]): void {
  if (store.getState().ui.loading) {
    store.dispatch(setLoading(undefined));
  }
  entries.forEach((change) => {
    const etf = change.target as HTMLElement;
    if (!change.isIntersecting || (etf.dataset as any).tced === "true") return;
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
    (etf.dataset as any).tced = "true";
    if (window.parent.etfLoaded) {
      window.parent.etfLoaded.add("loaded");
    }
  });
}
const transcroberObserver: IntersectionObserver = new IntersectionObserver(onEntryId, {
  threshold: [0.9],
});

function loadSettingsFromParentFrame() {
  setPlatformHelper(proxy);

  if (window.parent.etfLoaded) {
    window.parent.etfLoaded.add("loaded");
  }
}

loadSettingsFromParentFrame();

const uniqueIds = missingWordIdsFromModels(currentModels, definitions);

ensureDefinitionsLoaded(proxy, [...uniqueIds], store).then(() => {
  ReactDOM.render(
    <Provider store={store}>
      <ETFStyleUpdater sheet={sheet} id={bookId} />
    </Provider>,
    document.body.appendChild(document.createElement("div")),
  );
  if (tokensInModel(currentModels) > MAX_TOKENS_FOR_PRE_ENRICHMENT) {
    for (const etf of document.getElementsByTagName("enriched-text-fragment")) {
      if (!etf.id) continue;
      transcroberObserver.observe(etf);
    }
  } else {
    for (const etf of document.getElementsByTagName("enriched-text-fragment")) {
      if (!etf.id) continue;
      etf.innerHTML = "";
      readObserver.observe(etf);
      render(
        createComponentVNode(ComponentClass, InfernoProvider, {
          store: store,
          children: [
            createComponentVNode(
              ComponentFunction,
              EnrichedTextFragment,
              {
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
    }
  }
  store.dispatch(setLoading(undefined));
  console.debug("Finished setting up elements for readium");
});

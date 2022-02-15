import jss from "jss";
import EnrichedTextFragment from "../../components/content/etf/EnrichedTextFragment";
import { addDefinitions } from "../../features/definition/definitionsSlice";
import { missingWordIdsFromModels, tokensInModel } from "../../lib/funclib";
import { DefinitionType, ComponentClass, ComponentFunction, KeyedModels } from "../../lib/types";
import preset from "jss-preset-default";
import { createComponentVNode, render } from "inferno";
import { Provider as InfernoProvider } from "inferno-redux";
import ReactDOM from "react-dom";
import { Provider } from "react-redux";
import { setLoading, setTokenDetails } from "../../features/ui/uiSlice";
import { setPlatformHelper } from "../../lib/proxies";
import { ETFStyles } from "../../components/Common";
import ETFStyleUpdater from "../../components/content/td/ETFStyleUpdater";
import { observerFunc } from "../../lib/stats";

declare global {
  interface Window {
    transcrobesModel: KeyedModels;
  }
}

const DATA_SOURCE = "readium.tsx";
const MAX_TOKENS_FOR_PRE_ENRICHMENT = 30000;

const bookId = window.parent.bookId;
const readerConfig = window.parent.transcrobesStore.getState().bookReader[bookId];
const currentModels = window.transcrobesModel;
const definitions = window.parent.transcrobesStore.getState().definitions;

const getReaderConfig = () => readerConfig;
const getKnownCards = () => window.parent.transcrobesStore.getState().knownCards;
const readObserver = new IntersectionObserver(observerFunc(getReaderConfig, currentModels, getKnownCards), {
  threshold: [1.0],
});

document.addEventListener("click", () => {
  window.parent.transcrobesStore.dispatch(setTokenDetails(undefined));
});

window.parent.transcrobesStore.dispatch(setLoading(true));

// this can't be done with a hook, so just doing it like this
jss.setup(preset());
const sheet = jss.createStyleSheet(ETFStyles, { link: true }).attach();
sheet.update(readerConfig);
const classes = sheet.classes;

export function onEntryId(entries: IntersectionObserverEntry[]): void {
  if (window.parent.transcrobesStore.getState().ui.loading) {
    window.parent.transcrobesStore.dispatch(setLoading(undefined));
  }
  entries.forEach((change) => {
    const etf = change.target as HTMLElement;
    if (!change.isIntersecting || (etf.dataset as any).tced === "true") return;
    etf.innerHTML = "";
    readObserver.observe(etf);
    render(
      createComponentVNode(ComponentClass, InfernoProvider, {
        store: window.parent.transcrobesStore,
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
  setPlatformHelper(window.parent.componentsConfig.proxy);

  if (window.parent.etfLoaded) {
    window.parent.etfLoaded.add("loaded");
  }
}

loadSettingsFromParentFrame();

const uniqueIds = missingWordIdsFromModels(currentModels, definitions);
window.parent.componentsConfig.proxy
  .sendMessagePromise<DefinitionType[]>({
    source: DATA_SOURCE,
    type: "getByIds",
    value: { collection: "definitions", ids: [...uniqueIds] },
  })
  .then((definitions) => {
    window.parent.transcrobesStore.dispatch(
      addDefinitions(
        definitions.map((def) => {
          return { ...def, glossToggled: false };
        }),
      ),
    );
    ReactDOM.render(
      <Provider store={window.parent.transcrobesStore}>
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
            store: window.parent.transcrobesStore,
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
    window.parent.transcrobesStore.dispatch(setLoading(undefined));
    console.debug("Finished setting up elements for readium");
  });

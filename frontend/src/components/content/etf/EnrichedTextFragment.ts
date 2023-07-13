import { createComponentVNode, render, VNode } from "inferno";
import { Provider } from "inferno-redux";
import { AdminStore } from "../../../app/createStore";
import { observerFunc } from "../../../lib/stats";
import { ComponentClass, ComponentFunction, KeyedModels, ModelType, ReaderState } from "../../../lib/types";
import { ETFStylesProps } from "../../Common";
import Entry from "./Entry";

type Props = {
  elementIds?: Set<string>;
  model: ModelType;
  readerConfig: ReaderState;
  classes: ETFStylesProps["classes"];
  clickable?: boolean;
};

export default function EnrichedTextFragment({ model, readerConfig, classes, clickable, elementIds }: Props): VNode[] {
  if (model?.s) {
    const ls = model.s.length;
    const sents: VNode[] = [];
    for (let i = 0; i < ls; i++) {
      const lt = model.s[i].t.length;
      if (lt) {
        const tokens: VNode[] = [];
        for (let j = 0; j < lt; j++) {
          elementIds?.add(`${model.id}:${i.toString()}:${j.toString()}`);
          tokens.push(
            createComponentVNode(ComponentClass, Entry, {
              elementIds,
              uniqueId: `${model.id}:${i.toString()}:${j.toString()}`,
              readerConfig,
              token: model.s[i].t[j],
              sentence: model.s[i],
              classes,
              clickable,
            }),
          );
        }
        sents.push(...tokens);
      }
    }
    return sents;
  } else {
    return [];
  }
}

export function enrichETFElements(
  element: HTMLElement,
  html: string,
  readerConfig: ReaderState,
  models: KeyedModels,
  store: AdminStore,
  classes: ETFStylesProps["classes"],
  elementIds?: Set<string>,
) {
  element.innerHTML = html;
  const elements = element.querySelectorAll("enriched-text-fragment");
  const readObserver = new IntersectionObserver(
    observerFunc(
      models,
      () => readerConfig,
      () => store.getState().knownCards,
    ),
    {
      threshold: [0, 1.0],
    },
  );
  for (let i = 0; i < elements.length; ++i) {
    const id = elements[i].id;
    if (!id) continue;
    if (!models[id]) {
      console.error("Missing model", models, elements, id, elements[i], html);
      continue;
    }
    const etf = document.createElement("span");
    etf.id = id;
    // FIXME: hardcoded style
    etf.style.cssText = "padding-left: 0.25em;";
    elements[i].replaceWith(etf);
    readObserver.observe(etf);
    render(
      createComponentVNode(ComponentClass, Provider, {
        store: store,
        children: [
          createComponentVNode(
            ComponentFunction,
            EnrichedTextFragment,
            {
              elementIds,
              readerConfig: readerConfig,
              model: models[id],
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

import { createComponentVNode, render, VNode } from "inferno";
import { Provider } from "inferno-redux";
import { AdminStore } from "../../../app/createStore";

import { ComponentClass, ComponentFunction, KeyedModels, ModelType, ReaderState } from "../../../lib/types";
import { ETFStylesProps } from "../../Common";
import { observerFunc } from "../../../lib/stats";
import Entry from "./Entry";

type Props = {
  model: ModelType;
  readerConfig: ReaderState;
  classes: ETFStylesProps["classes"];
};

export default function EnrichedTextFragment({ model, readerConfig, classes }: Props): VNode[] {
  if (model?.s) {
    const ls = model.s.length;
    const sents: VNode[] = [];
    for (let i = 0; i < ls; i++) {
      const lt = model.s[i].t.length;
      if (lt) {
        const tokens: VNode[] = [];
        for (let j = 0; j < lt; j++) {
          tokens.push(
            createComponentVNode(ComponentClass, Entry, {
              readerConfig,
              token: model.s[i].t[j],
              sentence: model.s[i],
              classes,
              clickable: true,
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
) {
  element.innerHTML = html;
  const elements = element.querySelectorAll("enriched-text-fragment");
  const readObserver = new IntersectionObserver(
    observerFunc(
      () => readerConfig,
      models,
      () => store.getState().knownCards,
    ),
    {
      threshold: [1.0],
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

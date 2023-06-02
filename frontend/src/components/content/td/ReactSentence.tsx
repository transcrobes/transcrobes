import { createComponentVNode, render } from "inferno";
import { Provider } from "inferno-redux";
import { ReactElement, useEffect, useRef } from "react";
import { store } from "../../../app/createStore";
import { useAppSelector, useJssStyles } from "../../../app/hooks";
import { isScriptioContinuo, missingWordIdsFromModels } from "../../../lib/funclib";
import { ComponentClass, ComponentFunction, ReaderState, SentenceType } from "../../../lib/types";
import Sentence from "../etf/Sentence";
import { ensureDefinitionsLoaded } from "../../../lib/dictionary";
import { platformHelper } from "../../../lib/proxies";

type Props = {
  sentence: SentenceType;
  readerConfig: ReaderState;
  sameTab?: boolean;
};

export default function ReactSentence({ sentence, readerConfig, sameTab }: Props): ReactElement {
  const ref = useRef<HTMLSpanElement>(null);
  const fromLang = useAppSelector((state) => state.userData.user.fromLang);
  const etfClasses = useJssStyles({ ...readerConfig, scriptioContinuo: isScriptioContinuo(fromLang) });

  useEffect(() => {
    (async () => {
      const uniqueIds = missingWordIdsFromModels({ ["fake"]: { id: 1, s: [sentence] } }, store.getState().definitions);
      if (uniqueIds.size > 0) {
        await ensureDefinitionsLoaded(platformHelper, [...uniqueIds], store);
      }
      const wrappedSentence = createComponentVNode(ComponentClass, Provider, {
        store: store,
        children: [
          createComponentVNode(ComponentFunction, Sentence, {
            classes: etfClasses,
            readerConfig,
            sentence,
            clickable: true,
            sameTab,
          }),
        ],
      });
      render(wrappedSentence, ref.current);
    })();
  }, [sentence]);

  return <span ref={ref} />;
}

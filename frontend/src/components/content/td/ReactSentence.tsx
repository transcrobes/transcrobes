import { createComponentVNode, render } from "inferno";
import { Provider } from "inferno-redux";
import { ReactElement, useEffect, useRef } from "react";
import { store } from "../../../app/createStore";
import { useJssStyles } from "../../../app/hooks";
import { ComponentClass, ComponentFunction, ReaderState, SentenceType } from "../../../lib/types";
import Sentence from "../etf/Sentence";

type Props = {
  sentence: SentenceType;
  readerConfig: ReaderState;
  sameTab?: boolean;
};

export default function ReactSentence({ sentence, readerConfig, sameTab }: Props): ReactElement {
  const ref = useRef<HTMLSpanElement>(null);
  const classes = useJssStyles(readerConfig);

  useEffect(() => {
    const wrappedSentence = createComponentVNode(ComponentClass, Provider, {
      store: store,
      children: [
        createComponentVNode(ComponentFunction, Sentence, {
          classes,
          readerConfig,
          sentence,
          clickable: true,
          sameTab,
        }),
      ],
    });

    render(wrappedSentence, ref.current);
  }, [sentence]);

  return <span ref={ref} />;
}

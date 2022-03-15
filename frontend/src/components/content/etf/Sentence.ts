import { createComponentVNode, VNode } from "inferno";
import { ComponentClass, ReaderState, SentenceType } from "../../../lib/types";
import { ETFStylesProps } from "../../Common";
import Entry from "./Entry";

type Props = {
  sentence: SentenceType;
  readerConfig: ReaderState;
  classes: ETFStylesProps["classes"];
  clickable?: boolean;
  sameTab?: boolean;
};

export default function Sentence({ sentence, readerConfig, classes, clickable, sameTab }: Props): VNode[] {
  const l = sentence.t.length;
  if (l) {
    const tokens: VNode[] = [];
    for (let i = 0; i < l; i++) {
      tokens.push(
        createComponentVNode(ComponentClass, Entry, {
          readerConfig,
          token: sentence.t[i],
          sentence,
          classes,
          clickable,
          sameTab,
        }),
      );
    }
    return tokens;
  } else {
    return [];
  }
}

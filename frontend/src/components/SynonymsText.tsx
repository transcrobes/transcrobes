import { ReactElement } from "react";
import { store } from "../app/createStore";
import { toPosLabels } from "../lib/libMethods";
import { SynonymType } from "../lib/types";
import { useTranslate } from "react-admin";

interface Props {
  synonyms: SynonymType[];
  showHr?: boolean;
}

export default function SynonymsText({ synonyms, showHr }: Props): ReactElement {
  const user = store.getState().userData.user;
  const translate = useTranslate();
  const synElements: ReactElement[] = [];
  let hasSynonyms = false;
  for (const posSynonym of synonyms) {
    if (posSynonym.values.length > 0) {
      hasSynonyms = true;
      synElements.push(
        <div key={"syn" + posSynonym.posTag}>
          {translate(toPosLabels(posSynonym.posTag, user.toLang))}: {posSynonym.values.join(", ")}
        </div>,
      );
    }
  }

  return (
    <>
      {hasSynonyms && showHr && <hr />}
      {synElements}
    </>
  );
}

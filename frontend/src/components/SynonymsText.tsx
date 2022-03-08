import { ReactElement } from "react";
import { store } from "../app/createStore";
import { toPosLabels } from "../lib/libMethods";
import { SynonymType } from "../lib/types";

interface Props {
  synonyms: SynonymType[];
}

export default function SynonymsText({ synonyms }: Props): ReactElement {
  const user = store.getState().userData.user;
  const synElements: ReactElement[] = [];
  for (const posSynonym of synonyms) {
    if (posSynonym.values.length > 0) {
      synElements.push(
        <div key={"syn" + posSynonym.posTag}>
          {toPosLabels(posSynonym.posTag, user?.fromLang || "zh-Hans")}: {posSynonym.values.join(", ")}
        </div>,
      );
    }
  }

  return <>{synElements}</>;
}

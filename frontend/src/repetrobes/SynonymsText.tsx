import { ReactElement } from "react";
import { toSimplePosLabels } from "../lib/lib";
import { SIMPLE_POS_TYPES, SynonymType } from "../lib/types";

interface Props {
  synonyms: SynonymType[];
}

export default function SynonymsText({ synonyms }: Props): ReactElement {
  const synElements: ReactElement[] = [];
  for (const posSynonym of synonyms) {
    if (posSynonym.values.length > 0) {
      synElements.push(
        <div key={"syn" + posSynonym.posTag}>
          {toSimplePosLabels(posSynonym.posTag as SIMPLE_POS_TYPES)}: {posSynonym.values.join(", ")}
        </div>,
      );
    }
  }

  return <>{synElements}</>;
}

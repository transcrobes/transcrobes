import { ReactElement } from "react";
import { ProviderTranslationType } from "../lib/types";
import PosItem from "./PosItem";

interface Props {
  providerEntry: ProviderTranslationType;
  classes?: any; // FIXME: any
}

export default function PosItems({ providerEntry, classes }: Props): ReactElement {
  return (
    <div className={classes?.translations}>
      {providerEntry.posTranslations.map((posItem) => {
        return <PosItem key={posItem.posTag} item={posItem} />;
      })}
    </div>
  );
}

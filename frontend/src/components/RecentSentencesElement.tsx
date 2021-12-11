import { ReactElement } from "react";
import { PosSentences, TREEBANK_POS_TYPES, ZH_TB_POS_LABELS } from "../lib/types";
import { InfoBox, ThinHR } from "./Common";
import Header from "./Header";
import RecentSentenceExample from "./RecentSentenceExample";

interface Props {
  recentPosSentences: PosSentences | null;
  loaded?: boolean; // FIXME: it is almost certain this is useless
}

export default function RecentSentencesElement({
  recentPosSentences,
  loaded,
}: Props): ReactElement {
  return (
    <>
      <ThinHR />
      <Header text="Recently Seen Phrases" />
      <div>
        {recentPosSentences &&
          Object.entries(recentPosSentences).length > 0 &&
          Object.entries(recentPosSentences).map(([pos, entry]) => {
            const typedPos = pos as TREEBANK_POS_TYPES;
            const simpleName = ZH_TB_POS_LABELS[typedPos];
            return (
              <InfoBox key={pos}>
                {simpleName}:{" "}
                {entry &&
                  entry.map((s, index) => {
                    return <RecentSentenceExample key={index} modelId={s.modelId || 0} />;
                  })}
              </InfoBox>
            );
          })}
      </div>
      {!recentPosSentences && <div>No recent phrases found</div>}
    </>
  );
}

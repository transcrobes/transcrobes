import { ReactElement } from "react";
import { DEFAULT_RECENTS_READER_CONFIG_STATE } from "../features/content/simpleReaderSlice";
import { toPosLabels } from "../lib/libMethods";
import { PosSentence, PosSentences, TreebankPosType } from "../lib/types";
import { InfoBox, ThinHR } from "./Common";
import Mouseover from "./content/td/Mouseover";
import Header from "./Header";
import RecentSentenceExample from "./RecentSentenceExample";

interface Props {
  recentPosSentences: PosSentences | null;
  onDelete?: (modelId: number | BigInt) => void;
}

export default function RecentSentencesElement({ recentPosSentences, onDelete }: Props): ReactElement {
  return (
    <>
      <ThinHR />
      <Header text="Recently Seen Phrases" />
      <div>
        {recentPosSentences &&
          Object.entries(recentPosSentences).length > 0 &&
          (Object.entries(recentPosSentences) as [TreebankPosType, PosSentence[]][]).map(([pos, entry]) => {
            return (
              <InfoBox key={pos}>
                <div>{toPosLabels(pos)}:</div>
                <ul>
                  {entry &&
                    entry.map((s, index) => {
                      return (
                        <RecentSentenceExample
                          readerConfig={DEFAULT_RECENTS_READER_CONFIG_STATE}
                          key={s.modelId || index}
                          sentence={s.sentence}
                          recentSentenceId={s.modelId || 0}
                          onDelete={onDelete}
                        />
                      );
                    })}
                </ul>
              </InfoBox>
            );
          })}
        <Mouseover readerConfig={DEFAULT_RECENTS_READER_CONFIG_STATE} />
      </div>
      {!recentPosSentences && <div>No recent phrases found</div>}
    </>
  );
}

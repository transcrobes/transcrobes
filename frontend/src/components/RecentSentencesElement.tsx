import { Box } from "@mui/system";
import { ReactElement } from "react";
import { useTranslate } from "react-admin";
import { useAppSelector } from "../app/hooks";
import { toPosLabels } from "../lib/libMethods";
import { AnyTreebankPosType, DEFAULT_RECENTS_READER_CONFIG_STATE, PosSentence, PosSentences } from "../lib/types";
import { InfoBox, ThinHR } from "./Common";
import Mouseover from "./content/td/Mouseover";
import Header from "./Header";
import RecentSentenceExample from "./RecentSentenceExample";

interface Props {
  recentPosSentences: PosSentences | null;
  onDelete?: (modelId: number | bigint) => void;
  sameTab?: boolean;
}

export default function RecentSentencesElement({ recentPosSentences, onDelete, sameTab }: Props): ReactElement {
  const toLang = useAppSelector((state) => state.userData.user.toLang);
  const translate = useTranslate();
  return (
    <>
      <ThinHR />
      <Header text={translate("screens.notrobes.recently_seen_phrases")} />
      <div>
        {recentPosSentences &&
          Object.entries(recentPosSentences).length > 0 &&
          (Object.entries(recentPosSentences) as [AnyTreebankPosType, PosSentence[]][]).map(([pos, entry]) => {
            return (
              <InfoBox key={pos}>
                <div>{translate(toPosLabels(pos, toLang))}:</div>
                <ul>
                  {entry &&
                    entry.map((s, index) => {
                      return (
                        <RecentSentenceExample
                          sameTab={sameTab}
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
      {(!recentPosSentences || Object.entries(recentPosSentences).length === 0) && (
        <Box sx={{ marginLeft: "1em" }}>{translate("screens.notrobes.no_recently_seen_phrases")}</Box>
      )}
    </>
  );
}

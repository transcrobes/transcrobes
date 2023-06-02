import { Button, Grid } from "@mui/material";
import _ from "lodash";
import { ReactElement, useEffect, useState } from "react";
import { useAppSelector } from "../app/hooks";
import { InfoBox } from "../components/Common";
import Mouseover from "../components/content/td/Mouseover";
import RecentSentenceExample from "../components/RecentSentenceExample";
import { toPosLabels } from "../lib/libMethods";
import {
  AnyTreebankPosType,
  CharacterType,
  DEFAULT_RECENTS_READER_CONFIG_STATE,
  PosSentence,
  PosSentences,
} from "../lib/types";
import QuestionDefinitionGraph from "./Common";
import { useTranslate } from "react-admin";

interface Props {
  recentSentences: PosSentences | null;
  characters: CharacterType[];
  showAnswer: boolean;
  word?: string;
}
export default function PhraseQuestion({ recentSentences, showAnswer, characters, word }: Props): ReactElement {
  const [current, setCurrent] = useState(0);
  const [sentences, setSentences] = useState<[AnyTreebankPosType, PosSentence][]>([]);
  const toLang = useAppSelector((state) => state.userData.user.toLang);
  const translate = useTranslate();
  if (recentSentences) {
    const sents: [AnyTreebankPosType, PosSentence][] = [];
    useEffect(() => {
      for (const [k, v] of Object.entries(recentSentences) as [AnyTreebankPosType, PosSentence[]][]) {
        if (v) {
          for (const s of v) sents.push([k, s]);
        }
      }
      const tmpSents = _.shuffle(sents);
      console.log("Setting sentences", tmpSents);
      setSentences(tmpSents);
    }, [recentSentences]);
  }
  return (
    <div>
      {(sentences && sentences[current] && (
        <Grid container justifyContent="center" alignItems="center">
          <Grid item>
            <InfoBox>
              ({translate(toPosLabels(sentences[current][0], toLang))}){" "}
              <RecentSentenceExample
                readerConfig={DEFAULT_RECENTS_READER_CONFIG_STATE}
                isListItem={true}
                recentSentenceId={sentences[current][1].modelId || 0}
                sentence={sentences[current][1].sentence}
              />
            </InfoBox>
          </Grid>
          {sentences.length > 1 && !showAnswer && (
            <Grid item style={{ margin: "1em" }}>
              <Button variant="outlined" onClick={() => setCurrent((current + 1) % sentences.length)}>
                Show another phrase
              </Button>
            </Grid>
          )}
        </Grid>
      )) || <div>Nothing found</div>}
      {showAnswer && <QuestionDefinitionGraph word={word} characters={characters} showAnswer={showAnswer} />}
      <Mouseover readerConfig={DEFAULT_RECENTS_READER_CONFIG_STATE} />
    </div>
  );
}

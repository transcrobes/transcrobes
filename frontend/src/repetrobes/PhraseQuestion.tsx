import { Button, Grid } from "@mui/material";
import _ from "lodash";
import { ReactElement, useEffect, useState } from "react";
import { InfoBox } from "../components/Common";
import Mouseover from "../components/content/td/Mouseover";
import RecentSentenceExample from "../components/RecentSentenceExample";
import { toPosLabels } from "../lib/libMethods";
import {
  CharacterType,
  DEFAULT_RECENTS_READER_CONFIG_STATE,
  PosSentence,
  PosSentences,
  TreebankPosType,
} from "../lib/types";
import QuestionDefinitionGraph from "./Common";

interface Props {
  recentSentences: PosSentences | null;
  characters: CharacterType[];
  showAnswer: boolean;
  word?: string;
}
export default function PhraseQuestion({ recentSentences, showAnswer, characters, word }: Props): ReactElement {
  const [current, setCurrent] = useState(0);
  const [sentences, setSentences] = useState<[TreebankPosType, PosSentence][]>([]);
  if (recentSentences) {
    const sents: [TreebankPosType, PosSentence][] = [];
    useEffect(() => {
      for (const [k, v] of Object.entries(recentSentences) as [TreebankPosType, PosSentence[]][]) {
        if (v) {
          for (const s of v) sents.push([k, s]);
        }
      }
      setSentences(_.shuffle(sents));
    }, [recentSentences]);
  }
  return (
    <div>
      {(sentences && sentences[current] && (
        <Grid container justifyContent="center" alignItems="center">
          <Grid item>
            <InfoBox>
              ({toPosLabels(sentences[current][0])}){" "}
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

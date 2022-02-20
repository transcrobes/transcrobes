import { Button, Grid } from "@material-ui/core";
import _ from "lodash";
import { ReactElement, useEffect, useState } from "react";
import { InfoBox } from "../components/Common";
import Mouseover from "../components/content/td/Mouseover";
import RecentSentenceExample from "../components/RecentSentenceExample";
import { DEFAULT_RECENTS_READER_CONFIG_STATE } from "../features/content/simpleReaderSlice";
import { CharacterType, PosSentence, PosSentences, ZH_TB_POS_LABELS } from "../lib/types";
import QuestionDefinitionGraph from "./Common";

interface Props {
  recentSentences: PosSentences | null;
  characters: CharacterType[];
  showAnswer: boolean;
}
export default function PhraseQuestion({ recentSentences, showAnswer, characters }: Props): ReactElement {
  const [current, setCurrent] = useState(0);
  const [sentences, setSentences] = useState<[string, PosSentence][]>([]);
  if (recentSentences) {
    const sents: [string, PosSentence][] = [];
    useEffect(() => {
      for (const [k, v] of [...Object.entries(recentSentences)]) {
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
              ({ZH_TB_POS_LABELS[sentences[current][0]]}){" "}
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
      {showAnswer && <QuestionDefinitionGraph characters={characters} showAnswer={showAnswer} />}
      <Mouseover readerConfig={DEFAULT_RECENTS_READER_CONFIG_STATE} />
    </div>
  );
}

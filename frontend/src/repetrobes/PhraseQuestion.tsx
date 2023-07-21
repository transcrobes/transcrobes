import { Button, Grid } from "@mui/material";
import _ from "lodash";
import { ReactElement, useEffect, useState } from "react";
import { useTranslate } from "react-admin";
import { useAppSelector } from "../app/hooks";
import { InfoBox } from "../components/Common";
import RecentSentenceExample from "../components/RecentSentenceExample";
import Mouseover from "../components/content/td/Mouseover";
import { toPosLabels } from "../lib/libMethods";
import {
  AnyTreebankPosType,
  CharacterType,
  DEFAULT_RECENTS_READER_CONFIG_STATE,
  DefinitionType,
  PosSentence,
  PosSentences,
} from "../lib/types";
import QuestionDefinitionGraph from "./Common";

interface Props {
  recentSentences: PosSentences | null;
  characters: (CharacterType | null)[];
  showAnswer: boolean;
  word?: DefinitionType;
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
      {showAnswer && (
        <QuestionDefinitionGraph
          word={word}
          characters={characters}
          showAnswer
          showToneColours
          showDiscoverableWord={!!word}
        />
      )}
      <Mouseover readerConfig={DEFAULT_RECENTS_READER_CONFIG_STATE} />
    </div>
  );
}

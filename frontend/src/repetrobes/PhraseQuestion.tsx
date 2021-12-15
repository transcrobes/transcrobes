import { Button, Grid, makeStyles } from "@material-ui/core";
import { ReactElement, useState } from "react";
import { InfoBox } from "../components/Common";
import DefinitionGraph from "../components/DefinitionGraph";
import RecentSentenceExample from "../components/RecentSentenceExample";
import { CharacterType, PosSentence, PosSentences, ZH_TB_POS_LABELS } from "../lib/types";

interface Props {
  recentSentences: PosSentences | null;
  characters: CharacterType[];
  showAnswer: boolean;
}
const useStyles = makeStyles((theme) => ({
  recents: { padding: "1em" },
}));
// let current = 0;
export default function PhraseQuestion({
  recentSentences,
  showAnswer,
  characters,
}: Props): ReactElement {
  // FIXME: I really, really tried to have it so that the current would initially get set
  // to a random number up to the max of the available recent sentences but it just didn't work
  // For some reason the state was not updating correctly and state from previous renders was being
  // shown...
  const classes = useStyles();
  const [current, setCurrent] = useState(0);
  const sentences: [string, PosSentence][] = [];
  if (recentSentences) {
    for (const [k, v] of [...Object.entries(recentSentences)]) {
      if (v) {
        for (const s of v) sentences.push([k, s]);
      }
    }
  }
  console.debug("recentSentences", recentSentences, showAnswer, current);
  return (
    <div>
      {(sentences && sentences[current] && sentences[current][1].modelId && (
        <Grid container justifyContent="center" alignItems="center">
          <Grid item>
            <InfoBox>
              ({ZH_TB_POS_LABELS[sentences[current][0]]}){" "}
              <RecentSentenceExample
                isListItem={true}
                cssClasses={classes.recents}
                modelId={sentences[current][1].modelId || 0}
              />
            </InfoBox>
          </Grid>
          {sentences.length > 1 && !showAnswer && (
            <Grid item style={{ margin: "1em" }}>
              <Button
                variant="outlined"
                onClick={() => setCurrent((current + 1) % sentences.length)}
              >
                Show another phrase
              </Button>
            </Grid>
          )}
        </Grid>
      )) || <div>Nothing found</div>}
      <DefinitionGraph characters={characters} showAnswer={showAnswer}></DefinitionGraph>
    </div>
  );
}

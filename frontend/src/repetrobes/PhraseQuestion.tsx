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

export default function PhraseQuestion({
  recentSentences,
  showAnswer,
  characters,
}: Props): ReactElement {
  const classes = useStyles();
  const sentences: [string, PosSentence][] = [];
  console.log("recentSentences", recentSentences, showAnswer);
  if (recentSentences) {
    for (const [k, v] of [...Object.entries(recentSentences)]) {
      if (v) {
        for (const s of v) sentences.push([k, s]);
      }
    }
  }

  const [current, setCurrent] = useState(Math.floor(Math.random() * sentences.length));
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

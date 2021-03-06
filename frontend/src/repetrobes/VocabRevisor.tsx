import { Box, Button, Theme, useTheme } from "@mui/material";
import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
import { ReactElement } from "react";
import PracticerInput from "../components/PracticerInput";
import { getWordId } from "../database/Schema";
import { ServiceWorkerProxy } from "../lib/proxies";
import {
  CardType,
  CharacterType,
  DefinitionType,
  RecentSentencesType,
  RepetrobesActivityConfigType,
} from "../lib/types";
import Answer from "./Answer";
import { CentredFlex } from "./Common";
import Question from "./Question";

dayjs.extend(utc);
dayjs.extend(timezone);

interface Props {
  proxy: ServiceWorkerProxy;
  theme: Theme;
  showAnswer: boolean;
  loading: boolean;
  currentCard: CardType | null;
  definition: DefinitionType | null;
  characters: CharacterType[] | null;
  recentPosSentences: RecentSentencesType | null;
  activityConfig: RepetrobesActivityConfigType;
  onCardFrontUpdate: (card: CardType) => void;
  onPractice: (wordId: string, grade: number) => void;
  onShowAnswer: () => void;
}

export function VocabRevisor({
  showAnswer,
  loading,
  currentCard,
  definition,
  characters,
  activityConfig,
  recentPosSentences,
  onCardFrontUpdate,
  onPractice,
  onShowAnswer,
}: Props): ReactElement {
  function handlePractice(wordId: string, grade: number) {
    onPractice(wordId, grade);
  }
  const { showSynonyms, showL2LengthHint, showRecents, showNormalFont } = activityConfig;
  const premature = currentCard && currentCard?.dueDate > dayjs().unix();
  const theme = useTheme();
  console.log(
    "prematurity",
    premature,
    currentCard,
    definition,
    currentCard?.dueDate,
    currentCard?.updatedAt,
    dayjs().unix(),
  );
  if (recentPosSentences && definition) {
    Object.entries(recentPosSentences.posSentences).forEach(([pos, s]) => {
      const lemma = definition.graph;
      if (s) {
        s.forEach((sent) => {
          const now = Date.now() + Math.random();
          sent.sentence.t.forEach((t) => {
            if (t.l === lemma && t.pos === pos) {
              if (!t.style) {
                t.style = { color: theme.palette.success.main, "font-weight": "bold" };
                t.de = true;
              }
            }
          });
          sent.modelId = now;
        });
      }
    });
  }

  return (
    <>
      {!loading && !definition && <span>No review items loaded</span>}
      {!loading && !!definition && !!currentCard && !!characters && (
        <>
          {premature && (
            <Box sx={{ backgroundColor: premature ? "orange" : "inherit", textAlign: "center" }}>
              Card not due until{" "}
              {dayjs(currentCard.dueDate * 1000)
                .tz(dayjs.tz.guess())
                .format("YYYY-MM-DD HH:mm:ss")}
            </Box>
          )}
          <Question
            translationProviderOrder={activityConfig.translationProviderOrder || {}}
            premature={!!premature}
            card={currentCard}
            definition={definition}
            characters={characters}
            recentSentences={recentPosSentences?.posSentences || null}
            showSynonyms={showSynonyms}
            showL2LengthHint={showL2LengthHint}
            showNormalFont={showNormalFont}
            showAnswer={showAnswer}
            onCardFrontUpdate={onCardFrontUpdate}
          />
          {showAnswer ? (
            <div>
              <Answer
                translationProviderOrder={activityConfig.translationProviderOrder || {}}
                card={currentCard}
                definition={definition}
                recentSentences={recentPosSentences?.posSentences || null}
                showSynonyms={showSynonyms}
                showRecents={showRecents}
                showNormalFont={showNormalFont}
                onCardFrontUpdate={onCardFrontUpdate}
              />
              <div style={{ display: "flex", justifyContent: "center" }}>
                <div style={{ width: "100%", maxWidth: "800px" }}>
                  <PracticerInput wordId={getWordId(currentCard)} onPractice={handlePractice} />
                </div>
              </div>
            </div>
          ) : (
            <CentredFlex>
              <Button onClick={onShowAnswer} variant="contained" color="primary">
                Show Answer
              </Button>
            </CentredFlex>
          )}
        </>
      )}
    </>
  );
}

export default VocabRevisor;

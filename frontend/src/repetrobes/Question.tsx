import { Box } from "@mui/material";
import { ReactElement } from "react";
import { CARD_TYPES, getCardType } from "../database/Schema";
import { CardType, CharacterType, DefinitionType, PosSentences } from "../lib/types";
import GraphQuestion from "./GraphQuestion";
import MeaningQuestion from "./MeaningQuestion";
import PhraseQuestion from "./PhraseQuestion";
import SoundQuestion from "./SoundQuestion";

interface QuestionProps {
  card: CardType;
  definition: DefinitionType;
  characters: CharacterType[];
  recentSentences: PosSentences | null;
  showSynonyms: boolean;
  showL2LengthHint: boolean;
  showNormalFont?: boolean;
  showAnswer: boolean;
  premature: boolean;
  translationProviderOrder: Record<string, number>;
  onCardFrontUpdate: (card: CardType) => void;
}

export default function Question({
  card,
  definition,
  characters,
  recentSentences,
  showSynonyms,
  showL2LengthHint,
  showNormalFont,
  showAnswer,
  premature,
  translationProviderOrder,
  onCardFrontUpdate,
}: QuestionProps): ReactElement {
  const cardType = getCardType(card);
  const word = showNormalFont || characters.length === 0 ? definition : undefined;
  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        padding: { xs: "0.3em", sm: "1em" },
        backgroundColor: premature ? "orange" : "inherit",
      }}
    >
      {(cardType === CARD_TYPES.GRAPH.toString() && (
        <GraphQuestion
          word={word}
          card={card}
          characters={characters}
          showAnswer={showAnswer}
          showDiscoverableWord={!!word}
        />
      )) ||
        (cardType === CARD_TYPES.SOUND.toString() && (
          <SoundQuestion
            word={word}
            card={card}
            definition={definition}
            characters={characters}
            showAnswer={showAnswer}
          />
        )) ||
        (cardType === CARD_TYPES.MEANING.toString() && (
          <MeaningQuestion
            word={word}
            translationProviderOrder={translationProviderOrder}
            card={card}
            definition={definition}
            characters={characters}
            showSynonyms={showSynonyms}
            showL2LengthHint={showL2LengthHint}
            showAnswer={showAnswer}
            onCardFrontUpdate={onCardFrontUpdate}
          />
        )) ||
        (cardType === CARD_TYPES.PHRASE.toString() && (
          <PhraseQuestion
            word={word}
            recentSentences={recentSentences}
            showAnswer={showAnswer}
            characters={characters}
          />
        ))}
    </Box>
  );
}

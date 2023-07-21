import { Box } from "@mui/material";
import { ReactElement } from "react";
import { CARD_TYPES, getCardType } from "../workers/rxdb/Schema";
import { CardType, DefinitionType, PosSentences } from "../lib/types";
import GraphAnswer from "./GraphAnswer";
import MeaningAnswer from "./MeaningAnswer";
import PhraseAnswer from "./PhraseAnswer";
import SoundAnswer from "./SoundAnswer";

interface AnswerProps {
  card: CardType;
  definition: DefinitionType;
  recentSentences: PosSentences | null;
  showSynonyms: boolean;
  showRecents: boolean;
  translationProviderOrder: Record<string, number>;
  onCardFrontUpdate: (cardId: string, frontString: string) => void;
}

export default function Answer({
  card,
  definition,
  recentSentences,
  showSynonyms,
  showRecents,
  translationProviderOrder,
  onCardFrontUpdate,
}: AnswerProps): ReactElement {
  const cardType = getCardType(card);
  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        padding: { xs: "0.3em", sm: "1em" },
      }}
    >
      {(cardType === CARD_TYPES.GRAPH.toString() && (
        <GraphAnswer
          translationProviderOrder={translationProviderOrder}
          card={card}
          definition={definition}
          recentSentences={recentSentences}
          showSynonyms={showSynonyms}
          showRecents={showRecents}
          onCardFrontUpdate={onCardFrontUpdate}
        />
      )) ||
        (cardType === CARD_TYPES.SOUND.toString() && (
          <SoundAnswer
            translationProviderOrder={translationProviderOrder}
            card={card}
            definition={definition}
            recentSentences={recentSentences}
            showSynonyms={showSynonyms}
            showRecents={showRecents}
            onCardFrontUpdate={onCardFrontUpdate}
          />
        )) ||
        (cardType === CARD_TYPES.MEANING.toString() && (
          <MeaningAnswer
            recentSentences={recentSentences}
            showRecents={showRecents}
            card={card}
            definition={definition}
          />
        )) ||
        (cardType === CARD_TYPES.PHRASE.toString() && (
          <PhraseAnswer
            translationProviderOrder={translationProviderOrder}
            card={card}
            definition={definition}
            recentSentences={recentSentences}
            showSynonyms={showSynonyms}
            showRecents={showRecents}
            onCardFrontUpdate={onCardFrontUpdate}
          />
        ))}
    </Box>
  );
}

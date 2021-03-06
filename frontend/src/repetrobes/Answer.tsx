import { ReactElement } from "react";
import { makeStyles } from "tss-react/mui";
import { CARD_TYPES, getCardType } from "../database/Schema";
import { CardType, DefinitionType, PosSentences } from "../lib/types";
import GraphAnswer from "./GraphAnswer";
import MeaningAnswer from "./MeaningAnswer";
import PhraseAnswer from "./PhraseAnswer";
import SoundAnswer from "./SoundAnswer";

const useStyles = makeStyles()((theme) => ({
  answer: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    [theme.breakpoints.down("md")]: {
      padding: "0.3em",
    },
    [theme.breakpoints.up("sm")]: {
      padding: "1em",
    },
  },
}));

interface AnswerProps {
  card: CardType;
  definition: DefinitionType;
  recentSentences: PosSentences | null;
  showSynonyms: boolean;
  showRecents: boolean;
  showNormalFont?: boolean;
  translationProviderOrder: Record<string, number>;
  onCardFrontUpdate: (card: CardType) => void;
}

export default function Answer({
  card,
  definition,
  recentSentences,
  showSynonyms,
  showRecents,
  showNormalFont,
  translationProviderOrder,
  onCardFrontUpdate,
}: AnswerProps): ReactElement {
  const { classes } = useStyles();

  const cardType = getCardType(card);
  return (
    <div className={classes.answer}>
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
    </div>
  );
}

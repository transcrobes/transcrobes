import { makeStyles } from "@material-ui/core";
import { ReactElement } from "react";
import { CARD_TYPES, getCardType } from "../database/Schema";
import { CardType, DefinitionType, PosSentences } from "../lib/types";
import GraphAnswer from "./GraphAnswer";
import MeaningAnswer from "./MeaningAnswer";
import PhraseAnswer from "./PhraseAnswer";
import SoundAnswer from "./SoundAnswer";

const useStyles = makeStyles((theme) => ({
  answer: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    [theme.breakpoints.down("sm")]: {
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
  onCardFrontUpdate: (card: CardType) => void;
}

export default function Answer({
  card,
  definition,
  recentSentences,
  showSynonyms,
  showRecents,
  onCardFrontUpdate,
}: AnswerProps): ReactElement {
  const classes = useStyles();

  const cardType = getCardType(card);
  return (
    <div className={classes.answer}>
      {(cardType === CARD_TYPES.GRAPH.toString() && (
        <GraphAnswer
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

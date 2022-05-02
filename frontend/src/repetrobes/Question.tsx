import { ReactElement } from "react";
import { makeStyles } from "tss-react/mui";
import { CARD_TYPES, getCardType } from "../database/Schema";
import { CardType, CharacterType, DefinitionType, PosSentences } from "../lib/types";
import GraphQuestion from "./GraphQuestion";
import MeaningQuestion from "./MeaningQuestion";
import PhraseQuestion from "./PhraseQuestion";
import SoundQuestion from "./SoundQuestion";

interface StyleProps {
  premature: boolean;
}

const useStyles = makeStyles<StyleProps>()((theme, params) => ({
  question: {
    backgroundColor: params.premature ? "orange" : "inherit",
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

interface QuestionProps {
  card: CardType;
  definition: DefinitionType;
  characters: CharacterType[];
  recentSentences: PosSentences | null;
  showSynonyms: boolean;
  showL2LengthHint: boolean;
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
  showAnswer,
  premature,
  translationProviderOrder,
  onCardFrontUpdate,
}: QuestionProps): ReactElement {
  const { classes } = useStyles({ premature });
  const cardType = getCardType(card);
  return (
    <div className={classes.question}>
      {(cardType === CARD_TYPES.GRAPH.toString() && <GraphQuestion card={card} characters={characters} />) ||
        (cardType === CARD_TYPES.SOUND.toString() && (
          <SoundQuestion card={card} definition={definition} characters={characters} showAnswer={showAnswer} />
        )) ||
        (cardType === CARD_TYPES.MEANING.toString() && (
          <MeaningQuestion
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
          <PhraseQuestion recentSentences={recentSentences} showAnswer={showAnswer} characters={characters} />
        ))}
    </div>
  );
}

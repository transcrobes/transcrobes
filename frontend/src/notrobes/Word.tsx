import dayjs from "dayjs";
import { ReactElement } from "react";
import { $enum } from "ts-enum-util";
import { makeStyles } from "tss-react/mui";
import { ThinHR } from "../components/Common";
import DefinitionGraph from "../components/DefinitionGraph";
import DefinitionTranslations from "../components/DefinitionTranslations";
import DW from "../components/DiscoverableWord";
import { Frequency } from "../components/Frequency";
import Header from "../components/Header";
import PosItem from "../components/PosItem";
import PracticerInput from "../components/PracticerInput";
import RecentSentencesElement from "../components/RecentSentencesElement";
import SayIt from "../components/SayIt";
import { CARD_TYPES, getCardId, getCardType } from "../database/Schema";
import {
  CardType,
  CharacterType,
  DefinitionType,
  EMPTY_CARD,
  PosSentences,
  SortableListElementType,
  WordModelStatsType,
} from "../lib/types";

const useStyles = makeStyles()({
  characterDetails: {
    margin: ".5em",
    fontSize: "2em",
    verticalAlign: "middle",
  },
  soundBoxInner: {
    marginLeft: ".5em",
    display: "flex",
    alignItems: "center",
  },
  definitionGraph: { fontSize: "2em" },
  soundBoxOuter: {
    margin: ".5em",
    fontSize: "2em",
    display: "flex",
    justifyContent: "center",
  },
  infoBox: {
    margin: "0.7em",
  },
  meaningBox: {
    margin: ".5em",
    fontSize: "1.5em",
    display: "flex",
    justifyContent: "center",
  },
  caps: {
    textTransform: "capitalize",
  },
  cardsTable: {
    width: "400px",
    textAlign: "center",
  },
  fieldName: {
    fontWeight: "bold",
  },
});

interface WordInfoProps {
  definition: DefinitionType;
  characters: (CharacterType | null)[];
  meaningCard: CardType;
  onCardFrontUpdate: (card: CardType) => void;
}

function WordInfo({ definition, characters, meaningCard, onCardFrontUpdate }: WordInfoProps): ReactElement {
  const { classes } = useStyles();
  return (
    <>
      <div>
        <Header text="Card Revision Details" />
        <div className={classes.definitionGraph}>
          <DefinitionGraph charWidth={100} charHeight={100} characters={characters} showAnswer={true} />
        </div>
        <div className={classes.soundBoxOuter}>
          <div className={classes.soundBoxInner}>
            <Sound definition={definition} />
            <SayIt graph={definition.graph} />
          </div>
        </div>
        {/*
          FIXME: Put this back, with proper editing and showing what the cards would actually look like

        <div className={classes.meaningBox}>
          <Meaning
            translationProviderOrder={???}
            editable={false}
            showSynonyms={false}
            definition={definition}
            card={meaningCard}
            onCardFrontUpdate={onCardFrontUpdate}
          />
        </div> */}
      </div>
    </>
  );
}

interface PracticerProps {
  wordId: string;
  onPractice: (wordId: string, grade: number) => void;
}

function Practicer({ wordId, onPractice }: PracticerProps): ReactElement {
  return (
    <>
      <ThinHR />
      <div>
        <Header text="Card Actions" />
        <div>
          <PracticerInput wordId={wordId} onPractice={onPractice} />
        </div>
      </div>
    </>
  );
}

function ExistingCards({ cards, classes }: { cards: CardType[]; classes: any }): ReactElement {
  const cardsArray = [...cards.values()];
  const cardsRows = cardsArray.map((card) => {
    return (
      card && (
        <tr key={card.id}>
          <td className={classes.caps}>{$enum(CARD_TYPES).getKeyOrThrow(parseInt(getCardType(card)))}</td>
          <td>
            {/* FIXME: don't hardcode the localeString!!! */}
            {dayjs
              .unix(card.dueDate || 0)
              .toDate()
              .toLocaleString("en-UK")}
          </td>
          <td>{card.known ? "Yes" : "No"}</td>
        </tr>
      )
    );
  });

  return (
    <>
      <ThinHR />
      <div>
        <Header text="Existing Cards" />
        <div>
          {cardsArray.length > 0 ? ( // cards is a map
            <table className={classes.cardsTable}>
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Due Date</th>
                  <th>Known?</th>
                </tr>
              </thead>
              <tbody>{cardsRows}</tbody>
            </table>
          ) : (
            <span>No cards for this item</span>
          )}
        </div>
      </div>
    </>
  );
}
function WordLists({ lists }: { lists: SortableListElementType[] }): ReactElement {
  const { classes } = useStyles();
  return (
    <>
      <ThinHR />
      <div>
        <Header text="Lists (name: freq. position in list)" />
        {lists.length > 0 ? ( // cards is a map
          <div className={classes.infoBox}>
            {lists.map((wl) => `${wl.name}: ${wl.position}`).reduce((prev, curr) => prev + ", " + curr)}
          </div>
        ) : (
          <span>No lists for this item</span>
        )}
      </div>
    </>
  );
}

function CharacterDetails({
  characters,
  classes,
}: {
  characters: (CharacterType | null)[];
  classes: any;
}): ReactElement {
  return (
    <>
      <ThinHR />
      <div>
        <Header text="Radicals and composition" />
        {(characters.length > 0 && (
          <div>
            {characters
              .filter((x) => x)
              .map((char, ind) => {
                return (
                  <div key={ind}>
                    <span className={classes.characterDetails}>
                      <DW graph={char?.id} /> : <DW graph={char?.radical} /> : {char?.decomposition}
                    </span>
                    <span>
                      {char?.etymology?.type
                        ? ` => Type: ${char?.etymology?.type}${
                            char?.etymology?.phonetic ? ", Phonetic: " + char?.etymology?.phonetic : ""
                          }${char?.etymology?.semantic ? ", Semantic: " + char?.etymology?.semantic : ""} ${
                            char?.etymology?.hint ? "(" + char?.etymology?.hint + ")" : ""
                          }`
                        : ""}
                    </span>
                  </div>
                );
              })}
          </div>
        )) || <div className={classes.infoBox}>No character details found</div>}
      </div>
    </>
  );
}

function Synonyms({ definition }: { definition: DefinitionType }): ReactElement {
  const { classes } = useStyles();
  return (
    <>
      <ThinHR />
      <div>
        <Header text="Related Words" />
        {(definition.synonyms.length > 0 && (
          <div>
            {definition.synonyms.map((result, ind) => {
              return <PosItem key={ind} item={result} discoverableWords />;
            })}
          </div>
        )) || <div className={classes.infoBox}>No synonyms found</div>}
      </div>
    </>
  );
}

function WordModelStats({ wordModelStats }: { wordModelStats: WordModelStatsType }): ReactElement {
  const { classes } = useStyles();
  return (
    <>
      <ThinHR />
      <div>
        <Header text="Personal Word Stats" />
        {(wordModelStats && (
          <div>
            <div className={classes.infoBox}>
              <span style={{ fontWeight: "bold" }}>Nb. seen: </span>
              <span>{wordModelStats.nbSeen} </span>
            </div>
            <div className={classes.infoBox}>
              <span style={{ fontWeight: "bold" }}>Last seen: </span>
              {/* FIXME: nasty hardcoded locale!!! */}
              <span>
                {dayjs
                  .unix(wordModelStats.lastSeen || 0)
                  .toDate()
                  .toLocaleString("en-UK")}{" "}
              </span>
            </div>
            <div className={classes.infoBox}>
              <span style={{ fontWeight: "bold" }}>Nb. seen since last check: </span>
              <span>{wordModelStats.nbSeenSinceLastCheck} </span>
            </div>
            <div className={classes.infoBox}>
              <span style={{ fontWeight: "bold" }}>Nb. Checked: </span>
              <span>{wordModelStats.nbChecked} </span>
            </div>
            <div className={classes.infoBox}>
              <span style={{ fontWeight: "bold" }}>Last Checked: </span>
              <span>
                {dayjs
                  .unix(wordModelStats.lastChecked || 0)
                  .toDate()
                  .toLocaleString("en-UK")}{" "}
              </span>
            </div>
          </div>
        )) || <div className={classes.infoBox}>No word stats found</div>}
      </div>
    </>
  );
}

function ProviderTranslations({
  definition,
  translationProviderOrder,
}: {
  definition: DefinitionType;
  translationProviderOrder: Record<string, number>;
}): ReactElement {
  return (
    <>
      <ThinHR />
      <Header text="Entry Definitions" />
      <DefinitionTranslations definition={definition} translationProviderOrder={translationProviderOrder} />
    </>
  );
}

function Sound({ definition }: { definition: DefinitionType }): ReactElement {
  return <div>{definition.sound}</div>;
}

function WordMetadata({ definition }: { definition: DefinitionType }): ReactElement {
  const { classes } = useStyles();
  return (
    <>
      <ThinHR />
      <div>
        <Header text="Metadata" />
        <div className={classes.infoBox}>
          <span className={classes.fieldName}>HSK: </span>
          <span>
            {definition.hsk && definition.hsk.levels.length > 0 ? definition.hsk.levels.join(", ") : "Not in the HSK"}
          </span>
        </div>
        <div className={classes.infoBox}>
          <Frequency frequency={definition.frequency} />
        </div>
      </div>
    </>
  );
}

interface WordProps {
  definition: DefinitionType;
  cards: CardType[];
  wordModelStats: WordModelStatsType;
  recentPosSentences: PosSentences | null;
  lists: SortableListElementType[];
  characters: (CharacterType | null)[];
  translationProviderOrder: Record<string, number>;
  onPractice: (wordId: string, grade: number) => void;
  onDeleteRecent: (modelId: number | bigint) => void;
  onCardFrontUpdate: (card: CardType) => void;
}

function Word({
  definition,
  cards,
  wordModelStats,
  recentPosSentences,
  lists,
  characters,
  translationProviderOrder,
  onDeleteRecent,
  onPractice,
  onCardFrontUpdate,
}: WordProps): ReactElement {
  const { classes } = useStyles();
  return (
    definition && (
      <div>
        <WordInfo
          definition={definition}
          characters={characters}
          meaningCard={
            (cards && cards.filter((c) => getCardType(c) === CARD_TYPES.MEANING.toString())[0]) || {
              ...EMPTY_CARD,
              id: getCardId(definition.id, CARD_TYPES.MEANING.toString()),
            }
          }
          onCardFrontUpdate={onCardFrontUpdate}
        />
        <Practicer wordId={definition.id} onPractice={onPractice} />
        <ExistingCards cards={cards} classes={classes} />
        <CharacterDetails characters={characters} classes={classes} />
        <WordLists lists={lists} />
        <RecentSentencesElement recentPosSentences={recentPosSentences} onDelete={onDeleteRecent} sameTab />
        <WordMetadata definition={definition} />
        <ProviderTranslations definition={definition} translationProviderOrder={translationProviderOrder} />
        <Synonyms definition={definition} />
        <WordModelStats wordModelStats={wordModelStats} />
      </div>
    )
  );
}

export default Word;

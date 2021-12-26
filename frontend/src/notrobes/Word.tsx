import { ReactElement, useState } from "react";
import dayjs from "dayjs";
import { $enum } from "ts-enum-util";
import { Button, makeStyles } from "@material-ui/core";

import { say, wordIdsFromModels } from "../lib/funclib";
import { CARD_TYPES, getCardType, getCardId } from "../database/Schema";
import DefinitionGraph from "../components/DefinitionGraph";
import PracticerInput from "../components/PracticerInput";
import {
  CardType,
  CharacterType,
  DefinitionType,
  EMPTY_CARD,
  PosSentences,
  SortableListElementType,
  WordModelStatsType,
} from "../lib/types";

import {
  defineElements,
  getUserCardWords,
  setGlossing,
  setLangPair,
  setPlatformHelper,
  setSegmentation,
  USER_STATS_MODE,
} from "../lib/components";
import PosItem from "../components/PosItem";
import DefinitionTranslations from "../components/DefinitionTranslations";
import Meaning from "../components/Meaning";
import Header from "../components/Header";
import RecentSentencesElement from "../components/RecentSentencesElement";
import { ThinHR } from "../components/Common";

const useStyles = makeStyles(() => ({
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
  soundButton: { marginLeft: ".5em" },
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
}));

const DATA_SOURCE = "Word.tsx";

defineElements();

interface WordInfoProps {
  definition: DefinitionType;
  characters: (CharacterType | null)[];
  meaningCard: CardType;
  onCardFrontUpdate: (card: CardType) => void;
}

function WordInfo({
  definition,
  characters,
  meaningCard,
  onCardFrontUpdate,
}: WordInfoProps): ReactElement {
  const classes = useStyles();
  return (
    <>
      <div>
        <Header text="Card Revision Details" />
        <div className={classes.definitionGraph}>
          <DefinitionGraph
            charWidth={100}
            charHeight={100}
            characters={characters}
            showAnswer={true}
          />
        </div>
        <div className={classes.soundBoxOuter}>
          <div className={classes.soundBoxInner}>
            <Sound definition={definition} />
            <div className={classes.soundButton}>
              <Button onClick={() => say(definition.graph)} variant="contained" color="primary">
                Say it!
              </Button>
            </div>
          </div>
        </div>
        <div className={classes.meaningBox}>
          <Meaning
            editable={false}
            showSynonyms={false}
            definition={definition}
            card={meaningCard}
            onCardFrontUpdate={onCardFrontUpdate}
          />
        </div>
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

function ExistingCards({ cards }: { cards: CardType[] }): ReactElement {
  const classes = useStyles();
  const cardsArray = [...cards.values()];
  const cardsRows = cardsArray.map((card) => {
    return (
      card && (
        <tr key={card.id}>
          <td className={classes.caps}>
            {$enum(CARD_TYPES).getKeyOrThrow(parseInt(getCardType(card)))}
          </td>
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
  const classes = useStyles();
  return (
    <>
      <ThinHR />
      <div>
        <Header text="Lists (name: freq. position in list)" />
        {lists.length > 0 ? ( // cards is a map
          <div className={classes.infoBox}>
            {lists
              .map((wl) => `${wl.name}: ${wl.position}`)
              .reduce((prev, curr) => prev + ", " + curr)}
          </div>
        ) : (
          <span>No lists for this item</span>
        )}
      </div>
    </>
  );
}

function Synonyms({ definition }: { definition: DefinitionType }): ReactElement {
  const classes = useStyles();
  return (
    <>
      <ThinHR />
      <div>
        <Header text="Related Words" />
        {(definition.synonyms.length > 0 && (
          <div>
            {definition.synonyms.map((result, ind) => {
              return (
                // probably don't need the key, right?
                <PosItem key={ind} item={result} />
              );
            })}
          </div>
        )) || <div className={classes.infoBox}>No synonyms found</div>}
      </div>
    </>
  );
}

function WordModelStats({ wordModelStats }: { wordModelStats: WordModelStatsType }): ReactElement {
  const classes = useStyles();
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

function ProviderTranslations({ definition }: { definition: DefinitionType }): ReactElement {
  return (
    <>
      <ThinHR />
      <Header text="Entry Definitions" />
      <DefinitionTranslations definition={definition} />
    </>
  );
}

function Sound({ definition }: { definition: DefinitionType }): ReactElement {
  return <div>{definition.sound}</div>;
}

function WordMetadata({ definition }: { definition: DefinitionType }): ReactElement {
  const classes = useStyles();
  return (
    <>
      <ThinHR />
      <div>
        <Header text="Metadata" />
        <div className={classes.infoBox}>
          <span className={classes.fieldName}>HSK: </span>
          <span>
            {definition.hsk && definition.hsk.levels.length > 0
              ? definition.hsk.levels.join(", ")
              : "Not in the HSK"}
          </span>
        </div>
        <div className={classes.infoBox}>
          <span className={classes.fieldName}>Freq: </span>
          <span>
            {definition.frequency && definition.frequency.wcpm
              ? definition.frequency.wcpm
              : "No frequency data"}
          </span>
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
  onPractice: (wordId: string, grade: number) => void;
  onDeleteRecent: (modelId: number | BigInt) => void;
  onCardFrontUpdate: (card: CardType) => void;
}

function Word({
  definition,
  cards,
  wordModelStats,
  recentPosSentences,
  lists,
  characters,
  onDeleteRecent,
  onPractice,
  onCardFrontUpdate,
}: WordProps): ReactElement {
  const [loaded, setLoaded] = useState(false);
  setGlossing(USER_STATS_MODE.NO_GLOSS);
  setSegmentation(true);
  setLangPair(window.componentsConfig.langPair);
  setPlatformHelper(window.componentsConfig.proxy);

  if (recentPosSentences) {
    window.transcrobesModel = window.transcrobesModel || {};
    Object.entries(recentPosSentences).forEach(([pos, s]) => {
      const lemma = definition.graph;
      if (s) {
        s.forEach((sent) => {
          const now = Date.now() + Math.random();
          sent.sentence.t.forEach((t) => {
            if (t.l == lemma && t.pos === pos) {
              t.style = { color: "green", "font-weight": "bold" };
            }
          });
          window.transcrobesModel[now] = { id: now, s: [sent.sentence] };
          sent.modelId = now;
        });
      }
    });
    const uniqueIds = wordIdsFromModels(window.transcrobesModel);

    getUserCardWords().then(() => {
      window.componentsConfig.proxy
        .sendMessagePromise<DefinitionType[]>({
          source: DATA_SOURCE,
          type: "getByIds",
          value: { collection: "definitions", ids: [...uniqueIds] },
        })
        .then((definitions) => {
          window.cachedDefinitions = window.cachedDefinitions || new Map<string, DefinitionType>();
          definitions.map((definition) => {
            window.cachedDefinitions.set(definition.id, definition);
          });
          setLoaded(true);
        });
      document.addEventListener("click", () => {
        document.querySelectorAll("token-details").forEach((el) => el.remove());
      });
    });
  }
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
        <ExistingCards cards={cards} />
        <WordLists lists={lists} />
        <RecentSentencesElement
          loaded={loaded}
          recentPosSentences={recentPosSentences}
          onDelete={onDeleteRecent}
        />
        <WordMetadata definition={definition} />
        <ProviderTranslations definition={definition} />
        <Synonyms definition={definition} />
        <WordModelStats wordModelStats={wordModelStats} />
      </div>
    )
  );
}

export default Word;

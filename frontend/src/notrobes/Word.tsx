import { ReactElement, useState } from "react";
import dayjs from "dayjs";
import styled from "styled-components";
import { $enum } from "ts-enum-util";
import { Button } from "@material-ui/core";

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
  TREEBANK_POS_TYPES,
  WordModelStatsType,
  ZH_TB_POS_LABELS,
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
import { ThinHR } from "../components/Common";
import PosItem from "../components/PosItem";
import DefinitionTranslations from "../components/DefinitionTranslations";
import Meaning from "../components/Meaning";
import Header from "../components/Header";
import RecentSentencesElement from "../components/RecentSentencesElement";

const DATA_SOURCE = "Word.tsx";

defineElements();

const InfoBox = styled.div`
  margin: 0.7em;
`;

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
  return (
    <>
      <div>
        <Header text="Card Revision Details" />
        <div style={{ fontSize: "2em" }}>
          <DefinitionGraph
            charWidth={100}
            charHeight={100}
            characters={characters}
            showAnswer={true}
          />
        </div>
        <div style={{ margin: ".5em", fontSize: "2em", display: "flex", justifyContent: "center" }}>
          <div style={{ marginLeft: ".5em", display: "flex", alignItems: "center" }}>
            <Sound definition={definition} />
            <div style={{ marginLeft: ".5em" }}>
              <Button onClick={() => say(definition.graph)} variant="contained" color="primary">
                Say it!
              </Button>
            </div>
          </div>
        </div>
        <div
          style={{ margin: ".5em", fontSize: "1.5em", display: "flex", justifyContent: "center" }}
        >
          <Meaning
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
  const cardsArray = [...cards.values()];
  const cardsRows = cardsArray.map((card) => {
    return (
      card && (
        <tr key={card.id}>
          <td style={{ textTransform: "capitalize" }}>
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
            <table style={{ width: "400px", textAlign: "center" }}>
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
  return (
    <>
      <ThinHR />
      <div>
        <Header text="Lists (name: freq. position in list)" />
        {lists.length > 0 ? ( // cards is a map
          <InfoBox>
            {lists
              .map((wl) => `${wl.name}: ${wl.position}`)
              .reduce((prev, curr) => prev + ", " + curr)}
          </InfoBox>
        ) : (
          <span>No lists for this item</span>
        )}
      </div>
    </>
  );
}

function Synonyms({ definition }: { definition: DefinitionType }): ReactElement {
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
        )) || <InfoBox>No synonyms found</InfoBox>}
      </div>
    </>
  );
}

function WordModelStats({ wordModelStats }: { wordModelStats: WordModelStatsType }): ReactElement {
  return (
    <>
      <ThinHR />
      <div>
        <Header text="Personal Word Stats" />
        {(wordModelStats && (
          <div>
            <InfoBox>
              <span style={{ fontWeight: "bold" }}>Nb. seen: </span>
              <span>{wordModelStats.nbSeen} </span>
            </InfoBox>
            <InfoBox>
              <span style={{ fontWeight: "bold" }}>Last seen: </span>
              {/* FIXME: nasty hardcoded locale!!! */}
              <span>
                {dayjs
                  .unix(wordModelStats.lastSeen || 0)
                  .toDate()
                  .toLocaleString("en-UK")}{" "}
              </span>
            </InfoBox>
            <InfoBox>
              <span style={{ fontWeight: "bold" }}>Nb. seen since last check: </span>
              <span>{wordModelStats.nbSeenSinceLastCheck} </span>
            </InfoBox>
            <InfoBox>
              <span style={{ fontWeight: "bold" }}>Nb. Checked: </span>
              <span>{wordModelStats.nbChecked} </span>
            </InfoBox>
            <InfoBox>
              <span style={{ fontWeight: "bold" }}>Last Checked: </span>
              <span>
                {dayjs
                  .unix(wordModelStats.lastChecked || 0)
                  .toDate()
                  .toLocaleString("en-UK")}{" "}
              </span>
            </InfoBox>
          </div>
        )) || <InfoBox>No word stats found</InfoBox>}
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
  return (
    <>
      <ThinHR />
      <div>
        <Header text="Metadata" />
        <InfoBox>
          <span style={{ fontWeight: "bold" }}>HSK: </span>
          <span>
            {definition.hsk && definition.hsk.levels.length > 0
              ? definition.hsk.levels.join(", ")
              : "Not in the HSK"}
          </span>
        </InfoBox>
        <InfoBox>
          <span style={{ fontWeight: "bold" }}>Freq: </span>
          <span>
            {definition.frequency && definition.frequency.wcpm
              ? definition.frequency.wcpm
              : "No frequency data"}
          </span>
        </InfoBox>
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
  onCardFrontUpdate: (card: CardType) => void;
}

function Word({
  definition,
  cards,
  wordModelStats,
  recentPosSentences,
  lists,
  characters,
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
        <RecentSentencesElement loaded={loaded} recentPosSentences={recentPosSentences} />
        <WordMetadata definition={definition} />
        <ProviderTranslations definition={definition} />
        <Synonyms definition={definition} />
        <WordModelStats wordModelStats={wordModelStats} />
      </div>
    )
  );
}

export default Word;

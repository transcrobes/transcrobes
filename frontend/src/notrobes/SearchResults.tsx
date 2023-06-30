import { FormControlLabel, Switch } from "@mui/material";
import { useTranslate } from "react-admin";
import { $enum } from "ts-enum-util";
import { useAppDispatch, useAppSelector } from "../app/hooks";
import { Loading } from "../components/Loading";
import { CARD_TYPES, getCardId, getWordId } from "../database/Schema";
import { setLoading } from "../features/ui/uiSlice";
import { ServiceWorkerProxy } from "../lib/proxies";
import {
  CardType,
  CharacterType,
  DefinitionType,
  InputLanguage,
  PosSentences,
  ShortChar,
  ShortWord,
  SortableListElementType,
  WordModelStatsType,
} from "../lib/types";
import ShortWordList from "./ShortWordList";
import Word from "./Word";

const DATA_SOURCE = "SearchResults";

interface Props {
  handleDeleteRecent: (modelId: number | bigint) => void;
  setMessage: (message: string) => void;
  setCards: (cards: CardType[] | null) => void;
  setShowRelated: (showRelated: boolean) => void;
  setDictOnly: (dictOnly: boolean) => void;
  allWords: Record<string, ShortWord>;
  allChars: Record<string, ShortChar>;
  recentPosSentences: PosSentences | null;
  query: string;
  proxy: ServiceWorkerProxy;
  characters: (CharacterType | null)[] | null;
  cards: CardType[] | null;
  wordModelStats: WordModelStatsType | null;
  lists: SortableListElementType[] | null;
  showRelated: boolean;
  dictOnly: boolean;
  word: DefinitionType | null;
  filteredExistingByChars?: Record<string, ShortWord>;
  filteredExistingBySounds?: Record<string, ShortWord>;
  filteredExistingByRadicals?: Record<string, ShortWord>;
  fromLang: InputLanguage;
}

export default function SearchResults({
  proxy,
  query,
  allWords,
  allChars,
  dictOnly,
  filteredExistingByChars,
  filteredExistingByRadicals,
  filteredExistingBySounds,
  word,
  characters,
  cards,
  wordModelStats,
  recentPosSentences,
  lists,
  showRelated,
  fromLang,
  setDictOnly,
  setShowRelated,
  setCards,
  setMessage,
  handleDeleteRecent,
}: Props) {
  const translate = useTranslate();
  const dispatch = useAppDispatch();
  const dictionaries = useAppSelector((state) => state.dictionary);
  const translationProviderOrder = Object.keys(dictionaries).reduce(
    (acc, next, ind) => ({ ...acc, [next]: ind }),
    {} as Record<string, number>,
  );

  async function handleCardFrontUpdate(card: CardType) {
    await proxy.sendMessagePromise({
      source: DATA_SOURCE,
      type: "updateCard",
      value: card,
    });
    const updatedCards = await proxy.sendMessagePromise<CardType[]>({
      source: DATA_SOURCE,
      type: "getByIds",
      value: {
        collection: "cards",
        ids: Array.from($enum(CARD_TYPES).getValues()).map((ctype) => getCardId(getWordId(card), ctype)),
      },
    });

    setCards(updatedCards);
  }

  async function addOrUpdateCards(wordId: string, grade: number): Promise<void> {
    // FIXME: grade should be an enum
    if (word) {
      proxy.sendMessagePromise({
        source: DATA_SOURCE,
        type: "submitUserEvents",
        value: {
          type: "practice_card",
          data: {
            target_word: word.graph,
            grade: grade,
            source_sentence: "",
          },
          source: DATA_SOURCE,
        },
      });
    }
    const updatedCards = await proxy.sendMessagePromise<CardType[]>({
      source: DATA_SOURCE,
      type: "addOrUpdateCardsForWord",
      value: { wordId: wordId, grade },
    });
    setCards(updatedCards);
    dispatch(setLoading(undefined));
    setMessage(translate("screens.notrobes.cards_recorded"));
  }

  if (word && Object.entries(word).length > 0 && characters && cards && wordModelStats && lists) {
    return (
      <div>
        <div>
          <FormControlLabel
            control={
              <Switch
                name={"sr"}
                size="small"
                checked={showRelated}
                onChange={(_: any, checked: boolean) => setShowRelated(checked)}
              />
            }
            label={translate("screens.notrobes.show_related")}
            labelPlacement="end"
          />
        </div>
        {showRelated && query && Object.keys(allWords).length > 0 && Object.keys(allChars).length > 0 && (
          <>
            <div>
              <FormControlLabel
                control={
                  <Switch
                    name={"do"}
                    size="small"
                    checked={dictOnly}
                    onChange={(_: any, checked: boolean) => setDictOnly(checked)}
                  />
                }
                label={translate("screens.notrobes.common_only")}
                labelPlacement="end"
              />
            </div>
            <div style={{ display: "flex", justifyContent: "space-evenly" }}>
              {filteredExistingByChars && (
                <ShortWordList
                  sourceGraph={word.graph}
                  label={translate("screens.notrobes.by_chars")}
                  data={Object.values(filteredExistingByChars)}
                  onRowClick={(id) => `/notrobes?q=${id}`}
                />
              )}
              {filteredExistingBySounds && (
                <ShortWordList
                  sourceGraph={word.graph}
                  label={translate("screens.notrobes.by_sound")}
                  data={Object.values(filteredExistingBySounds)}
                  onRowClick={(id) => `/notrobes?q=${id}`}
                />
              )}
              {fromLang === "zh-Hans" && filteredExistingByRadicals && (
                <ShortWordList
                  sourceGraph={word.graph}
                  label={translate("screens.notrobes.by_radical")}
                  data={Object.values(filteredExistingByRadicals)}
                  onRowClick={(id) => `/notrobes?q=${id}`}
                />
              )}
            </div>
          </>
        )}
        <Loading
          show={showRelated && Object.keys(allWords).length === 0 && Object.keys(allChars).length === 0}
          top="0px"
          position="relative"
          message={translate("screens.notrobes.loading_related")}
        />

        <Word
          definition={word}
          characters={characters}
          cards={cards}
          wordModelStats={wordModelStats}
          recentPosSentences={recentPosSentences}
          lists={lists}
          translationProviderOrder={translationProviderOrder}
          onDeleteRecent={handleDeleteRecent}
          onPractice={addOrUpdateCards}
          onCardFrontUpdate={handleCardFrontUpdate}
        />
      </div>
    );
  } else {
    return <></>;
  }
}

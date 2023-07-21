import { useTranslate } from "react-admin";
import { $enum } from "ts-enum-util";
import { useAppDispatch, useAppSelector } from "../app/hooks";
import { DataManager } from "../data/types";
import { setLoading } from "../features/ui/uiSlice";
import {
  CardCacheType,
  CharacterType,
  DefinitionType,
  InputLanguage,
  PosSentences,
  ShortChar,
  ShortWord,
  SortableListElementType,
  WordModelStatsType,
} from "../lib/types";
import { CARD_TYPES, getCardId, getWordId } from "../workers/rxdb/Schema";
import Word from "./Word";
import { practiceCardsForWords } from "../workers/common-db";

const DATA_SOURCE = "SearchResults";

interface Props {
  onPractice: (wordId: string, grade: number) => void;
  handleDeleteRecent: (modelId: number | bigint) => void;
  // setMessage: (message: string) => void;
  // setCards: (cards: CardCacheType[] | null) => void;
  setDictOnly?: (dictOnly: boolean) => void;
  setShowRelated?: (showRelated: boolean) => void;
  allWords?: Record<string, ShortWord>;
  allChars?: Record<string, ShortChar>;
  recentPosSentences: PosSentences | null;
  query: string;
  proxy: DataManager;
  characters: (CharacterType | null)[] | null;
  cards: CardCacheType[] | null;
  wordModelStats: WordModelStatsType | null;
  lists: SortableListElementType[] | null;
  word: DefinitionType | null;
  dictOnly?: boolean;
  showRelated?: boolean;
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
  handleDeleteRecent,
  onPractice,
}: Props) {
  const translate = useTranslate();
  const dispatch = useAppDispatch();
  const dictionaries = useAppSelector((state) => state.dictionary);
  const translationProviderOrder = Object.keys(dictionaries).reduce(
    (acc, next, ind) => ({ ...acc, [next]: ind }),
    {} as Record<string, number>,
  );

  async function handleCardFrontUpdate(cardId: string, frontString: string) {
    await proxy.setCardFront(cardId, frontString);
  }

  if (word && Object.entries(word).length > 0 && characters && cards && wordModelStats && lists) {
    return (
      <div>
        {/* FIXME: rehabilitate this! */}
        {/* <div>
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
        </div> */}

        {/* {showRelated && query && Object.keys(allWords).length > 0 && Object.keys(allChars).length > 0 && (
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
        )} */}
        {/* <Loading
          show={showRelated && Object.keys(allWords).length === 0 && Object.keys(allChars).length === 0}
          top="0px"
          position="relative"
          message={translate("screens.notrobes.loading_related")}
        /> */}

        <Word
          definition={word}
          characters={characters}
          cards={cards}
          wordModelStats={wordModelStats}
          recentPosSentences={recentPosSentences}
          lists={lists}
          translationProviderOrder={translationProviderOrder}
          onDeleteRecent={handleDeleteRecent}
          onPractice={onPractice}
          onCardFrontUpdate={handleCardFrontUpdate}
        />
      </div>
    );
  } else {
    return <></>;
  }
}

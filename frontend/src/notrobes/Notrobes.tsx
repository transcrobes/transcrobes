import { Container, FormControlLabel, Switch, TextField, Typography, useTheme } from "@mui/material";
import { makeStyles } from "tss-react/mui";
import axios, { CancelTokenSource } from "axios";
import { Converter, ConvertText } from "opencc-js";
import { ReactElement, useEffect, useMemo, useRef, useState } from "react";
import { TopToolbar } from "react-admin";
import { useNavigate, useLocation } from "react-router-dom";
import { $enum } from "ts-enum-util";
import { getAxiosHeaders } from "../app/createStore";
import { useAppDispatch, useAppSelector } from "../app/hooks";
import HelpButton from "../components/HelpButton";
import GlobalLoading, { Loading } from "../components/Loading";
import { CardDocument, CARD_TYPES, getCardId, getWordId } from "../database/Schema";
import { setLoading } from "../features/ui/uiSlice";
import { simpOnly } from "../lib/libMethods";
import { ServiceWorkerProxy } from "../lib/proxies";
import {
  CardType,
  CharacterType,
  DefinitionType,
  DOCS_DOMAIN,
  NOTROBES_YT_VIDEO,
  PosSentence,
  PosSentences,
  RecentSentencesType,
  ShortChar,
  ShortWord,
  SortableListElementType,
  TreebankPosType,
  UserListWordType,
  USER_STATS_MODE,
  WordDetailsType,
  WordListNamesType,
  WordModelStatsType,
} from "../lib/types";
import ShortWordList from "./ShortWordList";
import Word from "./Word";
import WatchDemo from "../components/WatchDemo";

let timeoutId: number;
const MIN_LOOKED_AT_EVENT_DURATION = 2000; // ms
const MAX_ALLOWED_CHARACTERS = 6; // FIXME: obviously only somewhat sensible for Chinese...
const DATA_SOURCE = "Notrobes";

interface Props {
  proxy: ServiceWorkerProxy;
  url: URL;
}

const useStyles = makeStyles()((theme) => ({
  root: { margin: theme.spacing(1), maxWidth: "800px" },
  toolbar: { alignItems: "center" },
  message: { color: "red", fontWeight: "bold", fontSize: "2em" },
}));

function graphRecordsToCharRecords(entries: Record<string, ShortWord>, characters: Record<string, ShortChar>) {
  const newByChar: Record<string, Set<ShortWord>> = {};
  const newBySound: Record<string, Set<ShortWord>> = {};
  const newByRadical: Record<string, Set<ShortWord>> = {};
  for (const entry of Object.values(entries)) {
    for (const sound of entry.sounds) {
      if (sound in newBySound) {
        newBySound[sound].add(entry);
      } else {
        newBySound[sound] = new Set([entry]);
      }
    }
    for (const char of entry.id.split("")) {
      if (char in newByChar) {
        newByChar[char].add(entry);
      } else {
        newByChar[char] = new Set([entry]);
      }
      if (char in characters) {
        const charObj = characters[char];
        if (charObj.radical in newByRadical) {
          newByRadical[charObj.radical].add(entry);
        } else {
          newByRadical[charObj.radical] = new Set([entry]);
        }
      }
    }
  }
  return [newByChar, newBySound, newByRadical];
}

function useQuery() {
  const { search } = useLocation();
  return useMemo(() => new URLSearchParams(search), [search]);
}

function Notrobes({ proxy, url }: Props): ReactElement {
  const currentQueryParam = useQuery();
  const navigate = useNavigate();
  const converter = useRef<ConvertText>(Converter({ from: "t", to: "cn" }));
  const [query, setQuery] = useState<string>(currentQueryParam.get("q") || "");
  const [wordListNames, setWordListNames] = useState<WordListNamesType>({});
  const [userListWords, setUserListWords] = useState<UserListWordType>({});
  const [word, setWord] = useState<DefinitionType | null>(null);
  const [initialised, setInitialised] = useState<boolean>(false);
  const [message, setMessage] = useState<string>("");
  const [characters, setCharacters] = useState<(CharacterType | null)[] | null>(null);
  const [cards, setCards] = useState<CardType[] | null>(null);
  const [wordModelStats, setWordModelStats] = useState<WordModelStatsType | null>(null);
  const [recentPosSentences, setRecentPosSentences] = useState<PosSentences | null>(null);
  const [lists, setLists] = useState<SortableListElementType[] | null>(null);
  const [showRelated, setShowRelated] = useState<boolean>(false);
  const [dictOnly, setDictOnly] = useState<boolean>(true);
  const [allWords, setAllWords] = useState<Record<string, ShortWord>>({});
  const [allChars, setAllChars] = useState<Record<string, ShortChar>>({});
  const [userDictWords, setUserDictWords] = useState<Record<string, null>>({});
  const [byChar, setByChar] = useState<Record<string, Set<ShortWord>>>({});
  const [bySound, setBySound] = useState<Record<string, Set<ShortWord>>>({});
  const [byRadical, setByRadical] = useState<Record<string, Set<ShortWord>>>({});
  const [filteredExistingByChars, setFilteredExistingByChars] = useState<Record<string, ShortWord>>();
  const [filteredExistingBySounds, setFilteredExistingBySounds] = useState<Record<string, ShortWord>>();
  const [filteredExistingByRadicals, setFilteredExistingByRadicals] = useState<Record<string, ShortWord>>();

  const fromLang = useAppSelector((state) => state.userData.user.fromLang);
  const dispatch = useAppDispatch();
  const { classes } = useStyles();
  const theme = useTheme();

  const dictionaries = useAppSelector((state) => state.dictionary);
  const translationProviderOrder = Object.keys(dictionaries).reduce(
    (acc, next, ind) => ({ ...acc, [next]: ind }),
    {} as Record<string, number>,
  );

  let cancel: CancelTokenSource;

  useEffect(() => {
    if (!proxy.loaded) return;
    (async function () {
      const ulws = await proxy.sendMessagePromise<{
        userListWords: UserListWordType;
        wordListNames: WordListNamesType;
      }>({
        source: DATA_SOURCE,
        type: "getUserListWords",
      });
      setWordListNames(ulws.wordListNames);
      setUserListWords(ulws.userListWords);
      setInitialised(true);

      if (query) {
        runSearch(query);
      }
    })();
  }, [proxy.loaded]);

  useEffect(() => {
    (async () => {
      if (showRelated) {
        if (Object.keys(allWords).length === 0) {
          const userWords = await proxy.sendMessagePromise<Record<string, null>>({
            source: DATA_SOURCE,
            type: "getAllUserDictionaryEntries",
          });
          const words = await proxy.sendMessagePromise<Record<string, ShortWord>>({
            source: DATA_SOURCE,
            type: "getAllShortWords",
          });
          const chars = await proxy.sendMessagePromise<Record<string, ShortChar>>({
            source: DATA_SOURCE,
            type: "getAllShortChars",
          });
          const [newByChar, newBySound, newByRadical] = graphRecordsToCharRecords(words, chars);
          setByChar(newByChar);
          setBySound(newBySound);
          setByRadical(newByRadical);
          await filterExistingWords(query, chars, words, newByChar, newBySound, newByRadical, userWords);
          setUserDictWords(userWords);
          setAllChars(chars);
          setAllWords(words);
        } else {
          await filterExistingWords(query);
        }
      }
    })();
  }, [showRelated, dictOnly]);

  useEffect(() => {
    const q = currentQueryParam.get("q") || "";
    if (query !== q) {
      runSearch(q);
    }
  }, [currentQueryParam]);

  async function filterExistingWords(
    graph: string,
    chars: Record<string, ShortChar> = allChars,
    words: Record<string, ShortWord> = allWords,
    lByChar: Record<string, Set<ShortWord>> = byChar,
    lBySound: Record<string, Set<ShortWord>> = bySound,
    lByRadical: Record<string, Set<ShortWord>> = byRadical,
    userWords: Record<string, null> = userDictWords,
  ) {
    if (!graph) {
      return;
    }
    const newFilteredByChars: Record<string, ShortWord> = {};
    for (const char of graph.split("")) {
      if (lByChar[char]) {
        for (const val of lByChar[char]) {
          if (val.id.includes(graph) && (!dictOnly || val.isDict || val.id in userWords)) {
            newFilteredByChars[val.id] = val;
          }
        }
      }
    }
    const newFilteredByRadicals: Record<string, ShortWord> = {};
    const radicals = graph
      .split("")
      .map((c) => chars[c]?.radical || "")
      .join(" ");
    for (const char of graph.split("")) {
      if (lByRadical[chars[char]?.radical]) {
        for (const val of lByRadical[chars[char].radical]) {
          if (
            val.id
              .split("")
              .map((c) => chars[c]?.radical || "")
              .join(" ") === radicals &&
            (!dictOnly || val.isDict || val.id in userWords)
          ) {
            newFilteredByRadicals[val.id] = val;
          }
        }
      }
    }
    const newFilteredBySounds: Record<string, ShortWord> = {};
    const sounds = words[graph]?.sounds.join(" ");
    for (const sound of words[graph]?.sounds || []) {
      if (lBySound[sound]) {
        for (const val of lBySound[sound]) {
          if (val.sounds?.join(" ").includes(sounds) && (!dictOnly || val.isDict || val.id in userWords)) {
            newFilteredBySounds[val.id] = val;
          }
        }
      }
    }
    setFilteredExistingByChars(newFilteredByChars);
    setFilteredExistingBySounds(newFilteredBySounds);
    setFilteredExistingByRadicals(newFilteredByRadicals);
  }

  async function submitLookupEvents(lookupEvents: any[], userStatsMode: number) {
    // FIXME: userStatsMode should be an enum
    // lookup events should NOT be any
    await proxy.sendMessagePromise({
      source: DATA_SOURCE,
      type: "submitLookupEvents",
      value: { lemmaAndContexts: lookupEvents, userStatsMode, source: DATA_SOURCE },
    });
  }
  /**
   * Fetch the search results and update the state with the result.
   * Also cancels the previous query before making the new one.
   *
   * @param {String} query Search Query.
   *
   */
  async function fetchSearchResults(query: string): Promise<void> {
    if (cancel) {
      cancel.cancel();
    }
    cancel = axios.CancelToken.source();
    const details = await proxy.sendMessagePromise<WordDetailsType>({
      source: DATA_SOURCE,
      type: "getWordDetails",
      value: { dictionaryIds: Object.keys(dictionaries), graph: query },
    });

    if (!!details.word && !!details.word.id) {
      setWord(details.word);
      setCards(details.cards ? Array.from(details.cards.values()) : []);
      setCharacters(details.characters ? Array.from(details.characters.values()) : []);
      setWordModelStats(details.wordModelStats || { id: details.word.graph, updatedAt: 0 });
      const lemma = details.word.graph;
      if (details.recentPosSentences) {
        for (const [pos, rps] of Object.entries(details.recentPosSentences)) {
          if (rps) {
            for (const ps of rps) {
              ps.modelId = Date.now() + Math.random();
              for (const t of ps.sentence.t) {
                if (t.l == lemma && t.pos === pos) {
                  t.style = { color: theme.palette.success.main, "font-weight": "bold" };
                }
              }
            }
          }
        }
      }

      setRecentPosSentences(details.recentPosSentences);
      setMessage("");
      dispatch(setLoading(undefined));
      setLists(
        (userListWords[details.word.id] || []).map((x) => ({
          listId: x.listId,
          name: wordListNames[x.listId],
          position: x.position,
        })),
      );
      if (!timeoutId) {
        const lookupEvent = { target_word: details.word.graph, target_sentence: "" };
        timeoutId = window.setTimeout(() => {
          timeoutId = 0;
          submitLookupEvents([lookupEvent], USER_STATS_MODE.L1);
        }, MIN_LOOKED_AT_EVENT_DURATION);
      }
    } else {
      const headers = await getAxiosHeaders();
      console.debug("Going to the server for query with headers", query, headers);
      try {
        const res = (await axios.post(
          new URL("/api/v1/enrich/word_definitions", url.origin).href,
          { data: query },
          { cancelToken: cancel.token },
        )) as any;
        let resultNotFoundMsg = "";
        if (!res.data.definition) {
          resultNotFoundMsg = "There are no search results. Please try a new search";
          setCharacters(null);
          return;
        }
        const chars = await proxy.sendMessagePromise<CharacterType[]>({
          source: DATA_SOURCE,
          type: "getCharacterDetails",
          value: query.split(""),
        });
        setCharacters(chars);
        const definition: DefinitionType = res.data.definition;
        setWord(definition);
        setCards([]);
        setWordModelStats({ id: definition.graph, updatedAt: 0 });
        setRecentPosSentences(null);
        setLists([]);
        setMessage(resultNotFoundMsg);
        dispatch(setLoading(undefined));

        if (!timeoutId && !!definition) {
          const lookupEvent = { target_word: definition.graph, target_sentence: "" };
          timeoutId = window.setTimeout(() => {
            timeoutId = 0;
            submitLookupEvents([lookupEvent], USER_STATS_MODE.L1);
          }, MIN_LOOKED_AT_EVENT_DURATION);
        }
      } catch (error) {
        if (axios.isCancel(error) || error) {
          console.error("Error fetching new data", error);
          dispatch(setLoading(undefined));
          setMessage("Failed to fetch the data. Please check network");
          if (timeoutId) {
            window.clearTimeout(timeoutId);
            timeoutId = 0;
          }
        }
      }
    }
  }

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
    const updatedCards = await proxy.sendMessagePromise<CardDocument[]>({
      source: DATA_SOURCE,
      type: "addOrUpdateCardsForWord",
      value: { wordId: wordId, grade },
    });
    setCards(updatedCards);
    dispatch(setLoading(undefined));
    setMessage("Cards recorded");
  }
  function handleOnInputChange(event: React.ChangeEvent<HTMLInputElement>) {
    if (event.target.value !== query) {
      runSearch(event.target.value);
    }
  }

  function runSearch(q: string) {
    if (timeoutId) {
      window.clearTimeout(timeoutId);
      timeoutId = 0;
    }
    setQuery(q);
    setWord(null);
    setLists(null);
    setCards(null);
    setCharacters(null);
    setWordModelStats(null);
    setRecentPosSentences(null);
    setLists(null);
    dispatch(setLoading(undefined));
    if (showRelated && q) {
      filterExistingWords(q);
    }

    if (!q) {
      setMessage("");
    } else if (q && !simpOnly(q, fromLang) && !(q in allWords)) {
      console.debug("Query has illegal chars", q);
      setMessage("Only simplified characters can be searched for");
    } else if (q && converter && converter.current(q) !== q) {
      console.debug("Query contains traditional characters", q);
      setMessage("The system does not currently support traditional characters");
    } else if (q.length > MAX_ALLOWED_CHARACTERS) {
      console.debug(`Entered a query of more than ${MAX_ALLOWED_CHARACTERS} characters`, q);
      setMessage(`The system only handles words of up to ${MAX_ALLOWED_CHARACTERS} characters`);
    } else {
      dispatch(setLoading(true));
      setMessage("");
      fetchSearchResults(q);
      navigate(`/notrobes?q=${q}`, { replace: true });
    }
  }

  async function handleDeleteRecent(modelId: number | bigint) {
    if (word && recentPosSentences) {
      const newRecents: RecentSentencesType = { id: word.id, posSentences: {} };
      for (const [k, posSentence] of Object.entries(recentPosSentences) as [TreebankPosType, PosSentence[]][]) {
        if (posSentence) {
          for (const sent of posSentence) {
            if (sent.modelId != modelId) {
              if (!newRecents.posSentences[k]) {
                newRecents.posSentences[k] = [];
              }
              newRecents.posSentences[k]!.push(sent);
            }
          }
        }
      }
      await proxy.sendMessagePromise({
        source: DATA_SOURCE,
        type: "updateRecentSentences",
        value: [newRecents],
      });
      setRecentPosSentences(newRecents.posSentences);
    }
  }

  function renderSearchResults(): ReactElement {
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
              label="Show related"
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
                  label="Only commonly recognised words"
                  labelPlacement="end"
                />
              </div>
              <div style={{ display: "flex", justifyContent: "space-evenly" }}>
                {filteredExistingByChars && (
                  <ShortWordList
                    sourceGraph={word.graph}
                    label="By Character"
                    data={Object.values(filteredExistingByChars)}
                    onRowClick={(id) => `/notrobes?q=${id}`}
                  />
                )}
                {filteredExistingBySounds && (
                  <ShortWordList
                    sourceGraph={word.graph}
                    label="By Sound"
                    data={Object.values(filteredExistingBySounds)}
                    onRowClick={(id) => `/notrobes?q=${id}`}
                  />
                )}
                {filteredExistingByRadicals && (
                  <ShortWordList
                    sourceGraph={word.graph}
                    label="By Radical"
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
            message="Initialising related data indexes (15-60 secs)"
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
  const helpUrl = `//${DOCS_DOMAIN}/page/software/learn/notrobes/`;
  return (
    <>
      <TopToolbar className={classes.toolbar}>
        <WatchDemo url={NOTROBES_YT_VIDEO} />
        <HelpButton url={helpUrl} />
      </TopToolbar>
      <Container maxWidth="md">
        <Typography variant="h4">Notrobes: Vocabulary search, discover words</Typography>
        <div>
          <form className={classes.root} noValidate>
            <TextField
              value={query}
              disabled={!initialised}
              id="outlined-basic"
              label="Search..."
              variant="outlined"
              onChange={handleOnInputChange}
              fullWidth
            />
          </form>
        </div>
        <GlobalLoading />
        {message && <Typography className={classes.message}>{message}</Typography>}
        {renderSearchResults()}
      </Container>
    </>
  );
}

export default Notrobes;

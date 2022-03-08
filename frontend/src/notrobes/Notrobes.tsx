import { Container, makeStyles, TextField, Typography, useTheme } from "@material-ui/core";
import axios, { CancelTokenSource } from "axios";
import { Converter, ConvertText } from "opencc-js";
import { ReactElement, useEffect, useRef, useState } from "react";
import { TopToolbar } from "react-admin";
import { $enum } from "ts-enum-util";
import { getAxiosHeaders } from "../app/createStore";
import { useAppDispatch, useAppSelector } from "../app/hooks";
import HelpButton from "../components/HelpButton";
import Loading from "../components/Loading";
import { CardDocument, CARD_TYPES, getCardId, getWordId } from "../database/Schema";
import { setLoading } from "../features/ui/uiSlice";
import { simpOnly } from "../lib/libMethods";
import { ServiceWorkerProxy } from "../lib/proxies";
import {
  CardType,
  CharacterType,
  DefinitionType,
  PosSentence,
  PosSentences,
  RecentSentencesType,
  SortableListElementType,
  TreebankPosType,
  UserListWordType,
  USER_STATS_MODE,
  WordDetailsType,
  WordListNamesType,
  WordModelStatsType,
} from "../lib/types";
import Word from "./Word";

let timeoutId: number;
const MIN_LOOKED_AT_EVENT_DURATION = 2000; // ms
const MAX_ALLOWED_CHARACTERS = 6; // FIXME: obviously only somewhat sensible for Chinese...
const DATA_SOURCE = "Notrobes";

interface Props {
  proxy: ServiceWorkerProxy;
  url: URL;
}

const useStyles = makeStyles((theme) => ({
  root: { margin: theme.spacing(1), maxWidth: "800px" },
  toolbar: { alignItems: "center" },
  message: { color: "red", fontWeight: "bold", fontSize: "2em" },
}));

function Notrobes({ proxy, url }: Props): ReactElement {
  const converter = useRef<ConvertText>(Converter({ from: "t", to: "cn" }));
  const [query, setQuery] = useState<string>("");
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

  const fromLang = useAppSelector((state) => state.userData.user.fromLang);
  const dispatch = useAppDispatch();
  const classes = useStyles();
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
        value: {},
      });
      setWordListNames(ulws.wordListNames);
      setUserListWords(ulws.userListWords);
      setInitialised(true);
    })();
  }, [proxy.loaded]);

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
    // FIXME: externalise path string
    const searchUrl = new URL("/api/v1/enrich/word_definitions", url.origin).href;

    if (cancel) {
      cancel.cancel();
    }
    cancel = axios.CancelToken.source();

    const details = await proxy.sendMessagePromise<WordDetailsType>({
      source: DATA_SOURCE,
      type: "getWordDetails",
      value: { dictionaryIds: Object.keys(dictionaries), graph: query },
    });

    console.debug(`Attempted to getWordDetails, response is`, details);
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
        const res = (await axios.post(searchUrl, { data: query }, { cancelToken: cancel.token })) as any;
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
    if (timeoutId) {
      window.clearTimeout(timeoutId);
      timeoutId = 0;
    }

    const q = event.target.value;
    setQuery(q);
    setWord(null);
    setLists(null);
    setCards(null);
    setCharacters(null);
    setWordModelStats(null);
    setRecentPosSentences(null);
    setLists(null);
    dispatch(setLoading(undefined));

    if (!q) {
      setMessage("");
    } else if (q && !simpOnly(q, fromLang)) {
      console.debug("Query has illegal chars", q);
      setMessage("Only simplified characters can be searched for");
    } else if (query && converter && converter.current(query) !== query) {
      console.debug("Query contains traditional characters", query);
      setMessage("The system does not currently support traditional characters");
    } else if (query.length > MAX_ALLOWED_CHARACTERS) {
      console.debug(`Entered a query of more than ${MAX_ALLOWED_CHARACTERS} characters`, query);
      setMessage(`The system only handles words of up to ${MAX_ALLOWED_CHARACTERS} characters`);
    } else {
      dispatch(setLoading(true));
      setMessage("");
      fetchSearchResults(q);
    }
  }

  async function handleDeleteRecent(modelId: number | BigInt) {
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
  const helpUrl = "https://transcrob.es/page/software/learn/notrobes/";
  return (
    <>
      <TopToolbar className={classes.toolbar}>
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
        <Loading />
        {message && <Typography className={classes.message}>{message}</Typography>}
        {renderSearchResults()}
      </Container>
    </>
  );
}

export default Notrobes;

import { useState, useEffect, useRef, ReactElement } from "react";
import axios, { CancelTokenSource } from "axios";
import { Converter, ConvertText } from "opencc-js";
import { simpOnly } from "../lib/lib";
import { USER_STATS_MODE } from "../lib/lib";
import Word from "./Word";
import { getAxiosHeaders } from "../lib/JWTAuthProvider";
import { ServiceWorkerProxy } from "../lib/proxies";
import {
  CardType,
  CharacterType,
  DefinitionType,
  PosSentences,
  RecentSentencesType,
  SortableListElementType,
  UserListWordType,
  WordDetailsType,
  WordListNamesType,
  WordModelStatsType,
} from "../lib/types";
import { CardDocument, CARD_TYPES, getCardId, getWordId } from "../database/Schema";
import { $enum } from "ts-enum-util";
import { TopToolbar } from "react-admin";
import HelpButton from "../components/HelpButton";
import { Container, makeStyles, TextField, Typography } from "@material-ui/core";
import SearchLoading from "../components/SearchLoading";

const DATA_SOURCE = "Notrobes.jsx";

let timeoutId: number;
const MIN_LOOKED_AT_EVENT_DURATION = 2000; // ms
const MAX_ALLOWED_CHARACTERS = 6; // FIXME: obviously only somewhat sensible for Chinese...

interface Props {
  proxy: ServiceWorkerProxy;
  url: URL;
}

const useStyles = makeStyles((theme) => ({
  root: { margin: theme.spacing(1), maxWidth: "800px" },
  toolbar: { alignItems: "center" },
  message: { color: "red", fontWeight: "bold", fontSize: "2em" },
  loading: {
    textAlign: "center",
  },
}));

function Notrobes({ proxy, url }: Props): ReactElement {
  const converter = useRef<ConvertText>(Converter({ from: "t", to: "cn" }));
  const [query, setQuery] = useState<string>("");
  const [wordListNames, setWordListNames] = useState<WordListNamesType>({});
  const [userListWords, setUserListWords] = useState<UserListWordType>({});
  const [word, setWord] = useState<DefinitionType | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [initialised, setInitialised] = useState<boolean>(false);
  const [message, setMessage] = useState<string>("");
  const [characters, setCharacters] = useState<(CharacterType | null)[] | null>(null);
  const [cards, setCards] = useState<CardType[] | null>(null);
  const [wordModelStats, setWordModelStats] = useState<WordModelStatsType | null>(null);
  const [recentPosSentences, setRecentPosSentences] = useState<PosSentences | null>(null);
  const [lists, setLists] = useState<SortableListElementType[] | null>(null);

  const classes = useStyles();

  let cancel: CancelTokenSource;

  useEffect(() => {
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
  }, []);

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
      value: query,
    });

    console.debug(`Attempted to getWordDetails, response is`, details);
    if (!!details.word && !!details.word.id) {
      setWord(details.word);
      setCards(details.cards ? Array.from(details.cards.values()) : []);
      setCharacters(details.characters ? Array.from(details.characters.values()) : []);
      setWordModelStats(details.wordModelStats || { id: details.word.graph, updatedAt: 0 });
      setRecentPosSentences(details.recentPosSentences);
      setMessage("");
      setLoading(false);
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
          searchUrl,
          { data: query },
          { cancelToken: cancel.token, headers: headers },
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
        setLoading(false);

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
          setLoading(false);
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
        ids: Array.from($enum(CARD_TYPES).getValues()).map((ctype) =>
          getCardId(getWordId(card), ctype),
        ),
      },
    });

    setCards(updatedCards);
  }

  async function addOrUpdateCards(wordId: string, grade: number): Promise<void> {
    // FIXME: grade should be an enum
    const updatedCards = await proxy.sendMessagePromise<CardDocument[]>({
      source: DATA_SOURCE,
      type: "addOrUpdateCardsForWord",
      value: { wordId: wordId, grade },
    });
    setCards(updatedCards);
    setLoading(false);
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
    setLoading(false);

    if (!q) {
      setMessage("");
    } else if (q && !simpOnly(q)) {
      console.debug("Query has illegal chars", q);
      setMessage("Only simplified characters can be searched for");
    } else if (query && converter && converter.current(query) !== query) {
      console.debug("Query contains traditional characters", query);
      setMessage("The system does not currently support traditional characters");
    } else if (query.length > MAX_ALLOWED_CHARACTERS) {
      console.debug(`Entered a query of more than ${MAX_ALLOWED_CHARACTERS} characters`, query);
      setMessage(`The system only handles words of up to ${MAX_ALLOWED_CHARACTERS} characters`);
    } else {
      setLoading(true);
      setMessage("");
      fetchSearchResults(q);
    }
  }

  async function handleDeleteRecent(modelId: number | BigInt) {
    if (word && recentPosSentences) {
      console.debug("Word and record in handleDeleteRecent", word, recentPosSentences);
      const newRecents: RecentSentencesType = { id: word.id, posSentences: {} };
      for (const [k, posSentence] of Object.entries(recentPosSentences)) {
        if (posSentence) {
          for (const sent of posSentence) {
            console.debug("Looking for modelId", sent, sent.modelId, modelId);
            if (sent.modelId != modelId) {
              console.debug("Found the modelId", modelId, sent.modelId);
              if (!newRecents.posSentences[k]) {
                newRecents.posSentences[k] = [];
              }
              newRecents.posSentences[k]!.push(sent);
            }
          }
        }
      }
      console.debug("Submitting new recents", newRecents);
      await proxy.sendMessagePromise({
        source: DATA_SOURCE,
        type: "updateRecentSentences",
        value: [newRecents],
      });
      console.debug("Updating state with new PosSentences", newRecents.posSentences);
      setRecentPosSentences(newRecents.posSentences);
    }
  }

  function renderSearchResults() {
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
            onDeleteRecent={handleDeleteRecent}
            onPractice={addOrUpdateCards}
            onCardFrontUpdate={handleCardFrontUpdate}
          />
        </div>
      );
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
        {loading && (
          <div className={classes.loading}>
            <SearchLoading />
          </div>
        )}
        {message && <Typography className={classes.message}>{message}</Typography>}
        {renderSearchResults()}
      </Container>
    </>
  );
}

export default Notrobes;

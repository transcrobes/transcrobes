import { useState, useEffect, useRef, ReactElement } from "react";
import axios, { CancelTokenSource } from "axios";
import { IconContext } from "react-icons";
import { Converter, ConvertText } from "opencc-js";

import Loader from "../img/loader.gif";
import { simpOnly } from "../lib/lib";
import { USER_STATS_MODE } from "../lib/lib";
import Word from "./Word";
import { getAxiosHeaders } from "../lib/JWTAuthProvider";
import { ServiceWorkerProxy } from "../lib/proxies";
import {
  CardType,
  CharacterType,
  DefinitionType,
  SortableListElementType,
  UserListWordType,
  WordDetailsType,
  WordListNamesType,
  WordModelStatsType,
} from "../lib/types";
import { CardDocument } from "../database/Schema";

const DATA_SOURCE = "Notrobes.jsx";

let timeoutId: number;
const MIN_LOOKED_AT_EVENT_DURATION = 2000; // ms
const MAX_ALLOWED_CHARACTERS = 6; // FIXME: obviously only somewhat sensible for Chinese...

interface Props {
  proxy: ServiceWorkerProxy;
  url: URL;
}

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
  const [lists, setLists] = useState<SortableListElementType[] | null>(null);

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
      value: { lookupEvents, userStatsMode },
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
      if (timeoutId) {
        window.clearTimeout(timeoutId);
        timeoutId = 0;
      }
    }
    cancel = axios.CancelToken.source();

    const details = await proxy.sendMessagePromise<WordDetailsType>({
      source: DATA_SOURCE,
      type: "getWordDetails",
      value: { graph: query },
    });

    console.debug(`Attempted to getWordDetails, response is`, details);
    if (!!details.word && !!details.word.id) {
      setWord(details.word);
      setCards(details.cards ? Array.from(details.cards.values()) : []);
      setCharacters(details.characters ? Array.from(details.characters.values()) : []);
      setWordModelStats(details.wordModelStats || { id: details.word.graph, updatedAt: 0 });
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

  async function addOrUpdateCards(wordId: string, grade: number): Promise<void> {
    // FIXME: grade should be an enum
    const cards = await proxy.sendMessagePromise<CardDocument[]>({
      source: DATA_SOURCE,
      type: "addOrUpdateCards",
      value: { wordId: wordId, grade },
    });
    setCards(cards);
    setLoading(false);
    setMessage("Cards recorded");
  }

  function handleOnInputChange(event: React.ChangeEvent<HTMLInputElement>) {
    const q = event.target.value;
    setQuery(q);
    setWord(null);
    setLists(null);
    setCards(null);
    setCharacters(null);
    setWordModelStats(null);
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

  function renderSearchResults() {
    if (word && Object.entries(word).length > 0 && characters && cards && wordModelStats && lists) {
      return (
        <div>
          <Word
            definition={word}
            characters={characters}
            cards={cards}
            wordModelStats={wordModelStats}
            lists={lists}
            onPractice={addOrUpdateCards}
          />
        </div>
      );
    }
  }

  return (
    <div className="container">
      {/* Heading */}
      <h2 className="heading">Notrobes: Vocabulary search, discover words</h2>
      {/* Search Input */}
      <div>
        <label className="search-label" htmlFor="search-input">
          <input
            type="text"
            name="query"
            value={query}
            id="search-input"
            placeholder="Search..."
            disabled={!initialised}
            onChange={handleOnInputChange}
          />
          <i className="fa fa-search search-icon" aria-hidden="true" />
        </label>
      </div>
      {/* Loader */}
      <img
        src={Loader}
        className={`search-loading ${loading || !initialised ? "show" : "hide"}`}
        alt="loader"
      />

      {/* Message */}
      {message && (
        <div style={{ color: "red", fontWeight: "bold", fontSize: "2em" }}>{message}</div>
      )}

      {/* Result */}
      <IconContext.Provider value={{ color: "blue", size: "3em" }}>
        {renderSearchResults()}
      </IconContext.Provider>
    </div>
  );
}

export default Notrobes;

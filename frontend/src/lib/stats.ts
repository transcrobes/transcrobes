import dayjs from "dayjs";
import levenshtein from "js-levenshtein-esm";
import { platformHelper } from "./proxies";
import {
  AnyTreebankPosType,
  KeyedModels,
  ModelType,
  ONSCREEN_DELAY_IS_CONSIDERED_READ,
  PosSentences,
  ReaderState,
  RecentSentencesType,
  SentenceType,
  SerialisableDayCardWords,
  USER_STATS_MODE,
} from "./types";

const timeouts: { [key: string]: number } = {};
const NB_RECENT_SENTS_TO_KEEP = 3;
const MIN_LEVENSHTEIN_DIST_TO_KEEP = 4;
const IDEAL_RECENT_SENTS_LENGTH = 10;

const DATA_SOURCE = "stats";

// TODO: should min/max be configurable? by language maybe?
async function addToRecentSentences(model: ModelType, minTokens = 5, maxTokens = 25): Promise<void> {
  // TODO: think about the following...
  // This method has lots of "failures". As there can be lots of parallel executions (so we don't
  // block anything, and cos we don't really care...), there can be items that insert *after* another
  // instance of the method has queried for the "existing" items. That means the second one will think
  // there *isn't* a document when there really is. However, this doesn't really matter... as all we
  // care about is having sentences and if we are getting lots like this then that could well be
  // sub-optimal anyway.
  // It *might* be worth adding all these to a queue like it's done with the events (they are sort of
  // events anyway...), or even just adding this process to the normal events management, to have all
  // these user content consumption associated stuff done in a single place. For the moment this is
  // exploratory though, so we need to see how it performs, how much space it takes, etc, before
  // spending large amounts of time on it...

  const usableSentences = model.s.filter((s) => s.t.length >= minTokens && s.t.length <= maxTokens);
  // sort the list of sentences, with the closest in length to the ideal first
  if (usableSentences.length < 1) return;

  const wordIds = usableSentences.flatMap((s) => s.t.map((t) => t.id?.toString())).filter((x) => x) as string[];
  if (wordIds.length < 1) return;

  usableSentences.sort(
    (a, b) => Math.abs(IDEAL_RECENT_SENTS_LENGTH - a.t.length) - Math.abs(IDEAL_RECENT_SENTS_LENGTH - b.t.length),
  );

  const bestNewSentsForWord = new Map<string, { pos: AnyTreebankPosType; sent: SentenceType }[]>(); // string =bbi
  const newWordCombos = new Set<string>(); // wordId + # + pos
  for (const sent of usableSentences) {
    for (const token of sent.t) {
      if (token.id && token.pos) {
        const key = `${token.id.toString()}#${token.pos}`;
        if (!newWordCombos.has(key)) {
          newWordCombos.add(key);
          if (!bestNewSentsForWord.has(token.id.toString())) {
            bestNewSentsForWord.set(token.id.toString(), []);
          }
          bestNewSentsForWord.get(token.id.toString())?.push({ pos: token.pos, sent: sent });
        }
      }
    }
  }
  const existingRSents = new Map<string, RecentSentencesType>(
    await platformHelper.sendMessagePromise<Array<[string, RecentSentencesType]>>({
      source: DATA_SOURCE,
      type: "getRecentSentences",
      value: wordIds,
    }),
  );
  const inserts: RecentSentencesType[] = [];
  const updatedSents: RecentSentencesType[] = [];
  for (const wordId of wordIds) {
    const wordToUpdate = existingRSents.get(wordId);
    if (!wordToUpdate) {
      const posSentences: PosSentences = {};
      const s = bestNewSentsForWord.get(wordId);
      if (s) {
        for (const entry of s) {
          posSentences[entry.pos] = [{ dateViewed: dayjs().unix(), sentence: entry.sent, manual: false }];
          // FIXME: think about these...
          // source?: string; //URL
          // modelId?: number; //the nanosecond timestamp from the API
        }
        inserts.push({ id: wordId, posSentences: posSentences });
      }
    } else {
      const s = bestNewSentsForWord.get(wordId);
      if (s) {
        for (const entry of s) {
          const array = wordToUpdate.posSentences[entry.pos] || [];
          let keep = true;
          const plainSent = entry.sent.t.map((t) => t.l).join("");
          if (array.length === NB_RECENT_SENTS_TO_KEEP && array[0].dateViewed > dayjs().add(-1, "d").unix()) {
            // Only update a given word-pos max once per 24 hours
            continue;
          }
          // Only update if there isn't a very similar sentence already in the list
          for (const existing of array) {
            if (levenshtein(plainSent, existing.sentence.t.map((t) => t.l).join("")) < MIN_LEVENSHTEIN_DIST_TO_KEEP) {
              keep = false;
              break;
            }
          }
          if (keep) {
            array.unshift({
              dateViewed: dayjs().valueOf() / 1000,
              sentence: entry.sent,
              manual: false,
            });
            wordToUpdate.posSentences[entry.pos] = array.slice(0, NB_RECENT_SENTS_TO_KEEP);
            updatedSents.push(wordToUpdate);
          }
        }
      }
    }
  }
  // TODO: Should we wait here? Almost certainly NOT!
  if (inserts.length > 0) {
    platformHelper.sendMessagePromise<void>({
      source: DATA_SOURCE,
      type: "addRecentSentences",
      value: inserts,
    });
  }
  if (updatedSents.length > 0) {
    platformHelper.sendMessagePromise<void>({
      source: DATA_SOURCE,
      type: "updateRecentSentences",
      value: updatedSents,
    });
  }
}

// FIXME: glossing should be an enum
function vocabCountersFromETF(model: ModelType, glossing: number, knownCards: Partial<SerialisableDayCardWords>) {
  const counter: { [key: string]: [number, number] } = {};

  for (const sentence of model.s) {
    for (const token of sentence.t) {
      // it needs to have a pos for us to be interested, though maybe "bg" would be better
      if (token.pos) {
        const lemma = token.l;
        const lookedUp = glossing > USER_STATS_MODE.NO_GLOSS && !(lemma in (knownCards.knownCardWordGraphs || {}));
        counter[lemma] = counter[lemma]
          ? [counter[lemma][0] + 1, lookedUp ? counter[lemma][1] + 1 : 0]
          : [1, lookedUp ? 1 : 0];
      }
    }
  }
  return counter;
}

// the callback function that will be fired when the enriched-text-fragment element apears in the viewport
export function observerFunc(
  readerConfig: () => ReaderState,
  models: KeyedModels,
  knownCards: () => Partial<SerialisableDayCardWords>,
) {
  return function onScreen(entries: IntersectionObserverEntry[], observer: IntersectionObserver): void {
    for (const entry of entries) {
      // if (typeof entry.isVisible === "undefined") {
      //   entry.isVisible = true;
      // } // Feature detection for Intersection V2

      // if (entry.isIntersecting && entry.isVisible) {  // FIXME: exchange for the following for V2 onscreen detection
      if (entry.isIntersecting) {
        if (!models[entry.target.id]) {
          // There is sometimes etfs that don't have models (or text usually) for some hardly defensible hacky reasons
          continue;
        }
        // eslint-disable-next-line no-loop-func
        timeouts[entry.target.id] = window.setTimeout(() => {
          observer.unobserve(entry.target);
          const tstats = vocabCountersFromETF(models[entry.target.id], readerConfig().glossing, knownCards());
          if (Object.entries(tstats).length === 0) {
            console.debug("An empty model - how can this happen?", entry.target.id, models[entry.target.id]);
          } else {
            // TODO: WARNING:!!! the tstats consider that if it has been glossed, it has been looked up!!!
            // TODO: WARNING:!!! if you turn off/on glossing for a word temporarily, it considers only the
            // actual known state, not what was onscreen!!!
            const userEvent = {
              type: "bulk_vocab",
              source: DATA_SOURCE,
              data: tstats,
              userStatsMode: readerConfig().glossing,
            };
            platformHelper.sendMessage({
              source: "stats",
              type: "submitUserEvents",
              value: userEvent,
            });
          }
          // We are NOT waiting here, as this is a nice-to-have really, and we don't want it to
          // hold up other, immediately user-visible tasks. Only collect if we are doing that now,
          // which we do by default
          if (readerConfig().collectRecents) {
            addToRecentSentences(models[entry.target.id]);
          }
        }, ONSCREEN_DELAY_IS_CONSIDERED_READ);
      } else {
        clearTimeout(timeouts[entry.target.id]);
      }
    }
  };
}

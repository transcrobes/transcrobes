import dayjs from "dayjs";
import HTMLParsedElement from "html-parsed-element";
import levenshtein from "js-levenshtein-esm";
import * as utils from "./lib";
import { bestGuess, USER_STATS_MODE } from "./lib";
import { GRADE } from "../database/Schema";
import TranscrobesCSS from "../css/tccss";
import { AbstractWorkerProxy } from "./proxies";
import {
  DayCardWords,
  DefinitionType,
  KeyedModels,
  ModelType,
  PosSentences,
  RecentSentencesType,
  SentenceType,
  SIMPLE_POS_TYPES,
  TokenType,
  TREEBANK_POS_TYPES,
} from "./types";
export * from "./lib";

// FIXME: turn into config, this is likely only useful for Chinese
const SEGMENTED_BASE_PADDING = 6;
const NB_RECENT_SENTS_TO_KEEP = 3;
const MIN_LEVENSHTEIN_DIST_TO_KEEP = 4;
const IDEAL_RECENT_SENTS_LENGTH = 10;

const EVENT_SOURCE = "components";
const DATA_SOURCE = EVENT_SOURCE;
let timeoutId: number;
const MIN_LOOKED_AT_EVENT_DURATION = 2000; // milliseconds

declare global {
  interface Window {
    transcrobesModel: KeyedModels;
    cachedDefinitions: Map<string, DefinitionType>;
  }
}

let userCardWords: DayCardWords | null;
const timeouts: { [key: string]: number } = {};
const readObserver = new IntersectionObserver(onScreen, {
  threshold: [1.0],
  // FIXME: decide whether it is worth trying to use V2 of the IntersectionObserver API
  // Track the actual visibility of the element
  // trackVisibility: true,
  // Set a minimum delay between notifications
  // delay: 1000,  //at 1sec, we are conservative and shouldn't cause huge load
});

// FIXME: don't do here?
// utils.setEventSource('components-js');

// default to being the current document, but allow setting for cases where we have iframes, fullscreen elements, etc
let popupParent: HTMLElement = document.body;
function setPopupParent(value: HTMLElement): void {
  popupParent = value;
}

let platformHelper: AbstractWorkerProxy;
function setPlatformHelper(value: AbstractWorkerProxy): void {
  platformHelper = value;
}

type SVGTemplate = {
  viewBox: string;
  d: string;
};

const SVG_SOLID_PLUS: SVGTemplate = {
  viewBox: "0 0 448 512",
  d: "M416 208H272V64c0-17.67-14.33-32-32-32h-32c-17.67 0-32 14.33-32 32v144H32c-17.67 0-32 14.33-32 32v32c0 17.67 14.33 32 32 32h144v144c0 17.67 14.33 32 32 32h32c17.67 0 32-14.33 32-32V304h144c17.67 0 32-14.33 32-32v-32c0-17.67-14.33-32-32-32z",
};
const SVG_SOLID_CHECK: SVGTemplate = {
  viewBox: "0 0 512 512",
  d: "M173.898 439.404l-166.4-166.4c-9.997-9.997-9.997-26.206 0-36.204l36.203-36.204c9.997-9.998 26.207-9.998 36.204 0L192 312.69 432.095 72.596c9.997-9.997 26.207-9.997 36.204 0l36.203 36.204c9.997 9.997 9.997 26.206 0 36.204l-294.4 294.401c-9.998 9.997-26.207 9.997-36.204-.001z",
};
const SVG_SOLID_EXPAND: SVGTemplate = {
  viewBox: "0 0 448 512",
  d: "M0 180V56c0-13.3 10.7-24 24-24h124c6.6 0 12 5.4 12 12v40c0 6.6-5.4 12-12 12H64v84c0 6.6-5.4 12-12 12H12c-6.6 0-12-5.4-12-12zM288 44v40c0 6.6 5.4 12 12 12h84v84c0 6.6 5.4 12 12 12h40c6.6 0 12-5.4 12-12V56c0-13.3-10.7-24-24-24H300c-6.6 0-12 5.4-12 12zm148 276h-40c-6.6 0-12 5.4-12 12v84h-84c-6.6 0-12 5.4-12 12v40c0 6.6 5.4 12 12 12h124c13.3 0 24-10.7 24-24V332c0-6.6-5.4-12-12-12zM160 468v-40c0-6.6-5.4-12-12-12H64v-84c0-6.6-5.4-12-12-12H12c-6.6 0-12 5.4-12 12v124c0 13.3 10.7 24 24 24h124c6.6 0 12-5.4 12-12z",
};
const SVG_SOLID_COMPRESS: SVGTemplate = {
  viewBox: "0 0 448 512",
  d: "M436 192H312c-13.3 0-24-10.7-24-24V44c0-6.6 5.4-12 12-12h40c6.6 0 12 5.4 12 12v84h84c6.6 0 12 5.4 12 12v40c0 6.6-5.4 12-12 12zm-276-24V44c0-6.6-5.4-12-12-12h-40c-6.6 0-12 5.4-12 12v84H12c-6.6 0-12 5.4-12 12v40c0 6.6 5.4 12 12 12h124c13.3 0 24-10.7 24-24zm0 300V344c0-13.3-10.7-24-24-24H12c-6.6 0-12 5.4-12 12v40c0 6.6 5.4 12 12 12h84v84c0 6.6 5.4 12 12 12h40c6.6 0 12-5.4 12-12zm192 0v-84h84c6.6 0 12-5.4 12-12v-40c0-6.6-5.4-12-12-12H312c-13.3 0-24 10.7-24 24v124c0 6.6 5.4 12 12 12h40c6.6 0 12-5.4 12-12z",
};

// <div>Icons made by <a href="https://www.flaticon.com/authors/alfredo-hernandez" title="Alfredo Hernandez">Alfredo Hernandez</a> from <a href="https://www.flaticon.com/" title="Flaticon">www.flaticon.com</a></div>
const SVG_HAPPY_4: SVGTemplate = {
  viewBox: "0 0 490 490",
  d: "M69.086,490h351.829C459.001,490,490,459.001,490,420.914V69.086C490,30.991,459.001,0,420.914,0H69.086 C30.999,0,0,30.991,0,69.086v351.829C0,459.001,30.999,490,69.086,490z M332.349,132.647c23.551,0,42.642,19.091,42.642,42.641 c0,23.551-19.091,42.642-42.642,42.642c-23.55,0-42.641-19.091-42.641-42.642C289.708,151.738,308.799,132.647,332.349,132.647z M352.292,300.927l18.303,24.554c-41.676,31.089-83.486,41.452-120.691,41.452c-73.886,0-129.693-40.853-130.53-41.466 l18.333-24.539C142.104,304.186,246.436,379.882,352.292,300.927z M157.651,132.647c23.55,0,42.641,19.091,42.641,42.641 c0,23.551-19.091,42.642-42.641,42.642c-23.551,0-42.642-19.091-42.642-42.642C115.009,151.738,134.1,132.647,157.651,132.647z",
};

const SVG_SAD: SVGTemplate = {
  viewBox: "0 0 490 490",
  d: "M69.086,490h351.829C459.001,490,490,459.001,490,420.914V69.086C490,30.991,459.001,0,420.914,0H69.086 C30.991,0,0,30.991,0,69.086v351.829C0,459.001,30.991,490,69.086,490z M336.875,348.06h-183.75v-30.625h183.75V348.06z M332.349,132.647c23.551,0,42.642,19.091,42.642,42.641c0,23.551-19.091,42.642-42.642,42.642 c-23.55,0-42.641-19.091-42.641-42.642C289.708,151.738,308.799,132.647,332.349,132.647z M157.651,132.647 c23.55,0,42.641,19.091,42.641,42.641c0,23.551-19.091,42.642-42.641,42.642c-23.551,0-42.642-19.091-42.642-42.642 C115.009,151.738,134.1,132.647,157.651,132.647z",
};

const SVG_SAD_7: SVGTemplate = {
  viewBox: "0 0 490 490",
  d: "M69.086,490h351.829C459.001,490,490,459.001,490,420.914V69.086C490,30.991,459.001,0,420.914,0H69.086 C30.999,0,0,30.991,0,69.086v351.829C0,459.001,30.999,490,69.086,490z M332.349,132.647c23.551,0,42.642,19.091,42.642,42.641 c0,23.551-19.091,42.642-42.642,42.642c-23.55,0-42.641-19.091-42.641-42.642C289.708,151.738,308.799,132.647,332.349,132.647z M370.61,339.597l-18.303,24.554c-105.797-78.91-210.188-3.26-214.584,0l-18.333-24.539 C120.646,338.684,246.196,246.787,370.61,339.597z M157.651,132.647c23.55,0,42.641,19.091,42.641,42.641 c0,23.551-19.091,42.642-42.641,42.642c-23.551,0-42.642-19.091-42.642-42.642C115.009,151.738,134.1,132.647,157.651,132.647z",
};

type GRADE_SVGS_TYPE = {
  [key: string]: [SVGTemplate, string];
};

const GRADE_SVGS: GRADE_SVGS_TYPE = {
  [GRADE.UNKNOWN]: [SVG_SAD_7, "Add as unknown"],
  [GRADE.HARD]: [SVG_SAD, "Add as known poorly"],
  [GRADE.GOOD]: [SVG_HAPPY_4, "Add as known (but still need to revise)"],
  [GRADE.KNOWN]: [SVG_SOLID_CHECK, "Set word known (don't need to revise)"],
};

function originalSentenceFromTokens(tokens: TokenType[]): string {
  // currently just use
  return tokens.map((x) => x.l).join("");
}

async function generateSentences(
  doc: Document,
  sentences: SentenceType[],
  uCardWords: DayCardWords,
  addClick = true,
): Promise<HTMLElement> {
  const resolvedSents = await Promise.all(
    sentences.map(async (sentence) => {
      const sent = doCreateElement(doc, "span", "tcrobe-sent", null, null);

      const tokens = sentence.t;
      sent.dataset.sentCleaned = originalSentenceFromTokens(tokens);
      sent.dataset.sentTrans = sentence.l1 || "";

      const resolvedTokens = await Promise.all(
        tokens.map(async (token) => {
          const word = token.l;
          if (token.pos || token.bg) {
            // if there is a Best Guess key (even if empty) then we might want to look it up
            return await updateWordForEntry(
              doCreateElement(doc, "span", "tcrobe-entry", null, null),
              utils.glossing,
              utils.segmentation,
              token,
              doc,
              uCardWords,
              utils.glossNumberNouns,
              addClick,
              utils.mouseover,
            );
          } else {
            return doc.createTextNode(!utils.toEnrich(word) ? " " + word : word);
          }
        }),
      );
      for (const token of resolvedTokens) {
        sent.appendChild(token);
      }
      return sent;
    }),
  );
  const sents = doCreateElement(doc, "span", "tcrobe-sents", null, null);
  for (const sentence of resolvedSents) {
    sents.appendChild(sentence);
  }
  return sents;
}

function createSVG(
  template: SVGTemplate,
  elClass: string[] | string | null,
  elAttrs: [string, string][],
  elParent: HTMLElement,
): SVGSVGElement {
  const el = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  if (elClass) {
    const arr = Array.isArray(elClass) ? elClass : elClass.split(" ");
    arr.forEach((cssClass) => el.classList.add(cssClass));
  }
  if (elAttrs) {
    for (const attr of elAttrs) {
      el.setAttribute(attr[0], attr[1]);
    }
  }
  if (elParent) {
    elParent.appendChild(el);
  }
  el.setAttribute("viewBox", template.viewBox);
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("d", template.d);
  el.appendChild(path);
  return el;
}

// FIXME: glossing should be an enum
async function vocabCountersFromETF(model: ModelType, glossing: number) {
  return getUserCardWords().then((uCardWords) => {
    const counter: { [key: string]: [number, number] } = {};

    // FIXME: reduce will be faster
    for (const sentence of model.s) {
      for (const token of sentence.t) {
        // it needs to have a pos for us to be interested, though maybe "bg" would be better
        if (token["pos"]) {
          const lemma = token.l;
          const lookedUp =
            glossing > USER_STATS_MODE.NO_GLOSS && !uCardWords.knownCardWordGraphs.has(lemma);
          counter[lemma] = counter[lemma]
            ? [counter[lemma][0] + 1, lookedUp ? counter[lemma][1] + 1 : 0]
            : [1, lookedUp ? 1 : 0];
        }
      }
    }
    return counter;
  });
}

// TODO: should min/max be configurable? by language maybe?
async function addToRecentSentences(
  model: ModelType,
  minTokens = 5,
  maxTokens = 25,
): Promise<void> {
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

  usableSentences.sort(
    (a, b) =>
      Math.abs(IDEAL_RECENT_SENTS_LENGTH - a.t.length) -
      Math.abs(IDEAL_RECENT_SENTS_LENGTH - b.t.length),
  );

  const wordIds = usableSentences
    .flatMap((s) => s.t.map((t) => t.id?.toString()))
    .filter((x) => x) as string[];
  if (wordIds.length < 1) return;

  const bestNewSentsForWord = new Map<string, { pos: TREEBANK_POS_TYPES; sent: SentenceType }[]>(); // string =bbi
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
          posSentences[entry.pos] = [
            { dateViewed: dayjs().unix(), sentence: entry.sent, manual: false },
          ];
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
          if (
            array.length === NB_RECENT_SENTS_TO_KEEP &&
            array[0].dateViewed > dayjs().add(-1, "d").unix()
          ) {
            // Only update a given word-pos max once per 24 hours
            continue;
          }
          // Only update if there isn't a very similar sentence already in the list
          for (const existing of array) {
            if (
              levenshtein(plainSent, existing.sentence.t.map((t) => t.l).join("")) <
              MIN_LEVENSHTEIN_DIST_TO_KEEP
            ) {
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

// the callback function that will be fired when the enriched-text-fragment element apears in the viewport
function onScreen(entries: IntersectionObserverEntry[], observer: IntersectionObserver): void {
  const tcModel = window.transcrobesModel; // FIXME: this is not beautiful
  for (const entry of entries) {
    // if (typeof entry.isVisible === "undefined") {
    //   entry.isVisible = true;
    // } // Feature detection for Intersection V2

    // if (entry.isIntersecting && entry.isVisible) {  // FIXME: exchange for the following for V2 onscreen detection
    if (entry.isIntersecting) {
      // eslint-disable-next-line no-loop-func
      timeouts[entry.target.id] = window.setTimeout(() => {
        observer.unobserve(entry.target);
        vocabCountersFromETF(tcModel[entry.target.id], utils.glossing).then((tstats) => {
          if (Object.entries(tstats).length === 0) {
            console.debug(
              "An empty model - how can this happen?",
              entry.target.id,
              tcModel[entry.target.id],
            );
          } else {
            const userEvent = {
              type: "bulk_vocab",
              source: EVENT_SOURCE,
              data: tstats, // WARNING!!! the tstats consider that if it has been glossed, it has been looked up!!!
              userStatsMode: utils.glossing,
            };

            platformHelper.sendMessage({
              source: DATA_SOURCE,
              type: "submitUserEvents",
              value: userEvent,
            });
          }
          // We are NOT waiting here, as this is a nice-to-have really, and we don't want it to
          // hold up other, immediately user-visible tasks
          addToRecentSentences(tcModel[entry.target.id]);
        });
      }, utils.onScreenDelayIsConsideredRead);
    } else {
      clearTimeout(timeouts[entry.target.id]);
    }
  }
}
async function getUserCardWords(): Promise<DayCardWords> {
  if (userCardWords == null) {
    const value = await platformHelper.sendMessagePromise<DayCardWords>({
      source: DATA_SOURCE,
      type: "getCardWords",
      value: "",
    });
    userCardWords = {
      knownCardWordGraphs: new Set<string>(value.knownCardWordGraphs),
      allCardWordGraphs: new Set<string>(value.allCardWordGraphs),
      knownWordIdsCounter: value.knownWordIdsCounter,
    };
    return userCardWords;
  } else {
    return userCardWords;
  }
}

async function getWord(lemma: string): Promise<DefinitionType> {
  return platformHelper.sendMessagePromise<DefinitionType>({
    source: DATA_SOURCE,
    type: "getWordFromDBs",
    value: lemma,
  });
}

async function addOrUpdateCards(
  event: MouseEvent,
  wordInfo: DefinitionType,
  token: TokenType,
  grade: number,
  originElement: HTMLElement,
) {
  // buttons for SRS
  // don't know : hard : good
  // postpone : suspend : set known

  const fixedTarget = event.target as Element;

  const doc = originElement.ownerDocument;
  const popupDoc = fixedTarget.getRootNode();
  const actions = fixedTarget.closest(".tcrobe-def-actions");
  if (!popupDoc || !actions) throw new Error("Error adding cards");

  for (const icon of actions.querySelectorAll("svg")) {
    icon.classList.add("hidden");
  }
  actions.classList.add("loader");
  const practiceDetails = {
    wordInfo: wordInfo,
    grade: grade,
  };

  platformHelper.sendMessage({
    source: DATA_SOURCE,
    type: "practiceCardsForWord",
    value: practiceDetails,
  });
  const userEvent = {
    type: "token_details_card",
    data: {
      target_word: token.l,
      word_id: wordInfo.id,
      grade: grade,
      pos: token.pos,
      source_sentence: "",
    }, // FIXME: sourceSentence
    source: EVENT_SOURCE,
  };
  platformHelper.sendMessage(
    { source: DATA_SOURCE, type: "submitUserEvents", value: userEvent },
    () => {
      // FIXME: check whether it actually succeeds!
      const msg = (popupDoc as HTMLElement).querySelector(".tcrobe-def-messages");
      if (msg) {
        msg.classList.remove("hidden");
        msg.innerHTML = "Update submitted";
        setTimeout(() => {
          msg.classList.add("hidden");
          for (const icon of actions.querySelectorAll("svg")) {
            icon.classList.remove("hidden");
          }
          actions.classList.remove("loader");
        }, 2000);
      }
      cleanupAfterCardsUpdate(doc, grade, wordInfo);
      return "success";
    },
  );
  event.stopPropagation();
}

// FIXME: grade should be an enum
function cleanupAfterCardsUpdate(doc: Document, grade: number, wordInfo: DefinitionType) {
  //remove existing defs if we are setting knowledge level > UNKNOWN
  if (grade > GRADE.UNKNOWN) {
    for (const wordEl of doc.querySelectorAll(".tcrobe-gloss")) {
      if (wordEl.textContent === wordInfo.graph) {
        wordEl.classList.remove("tcrobe-gloss");
      }
    }
    // we MUST set userCardWords to null after a potential modification. the worker also has a cache but one that is up-to-date
    // so next time we need this an updated version will get re-pulled from the worker
    userCardWords = null;
  }
  // This will remove addition after an add, but what if you chose wrong and want to update?
  // the only option left will be to set to "known", which is not necessarily true
  // const plusImgs = doc.getElementsByClassName("tcrobe-def-plus");
  // while (plusImgs.length > 0) plusImgs[0].remove();
}

async function printRecentExamplesRx(doc: Document, token: TokenType, parentDiv: HTMLElement) {
  if (!token.pos || !token.id) return; // nothing found
  const dictDefinition =
    window.cachedDefinitions.get(token.id.toString()) || (await getWord(token.l));
  const existingRSents = new Map<string, RecentSentencesType>(
    await platformHelper.sendMessagePromise<Array<[string, RecentSentencesType]>>({
      source: DATA_SOURCE,
      type: "getRecentSentences",
      value: [dictDefinition.id],
    }),
  );
  const recents = existingRSents.get(dictDefinition.id);
  if (!recents) return; // nothing found
  const posRecents = recents.posSentences[token.pos];
  if (!posRecents || posRecents.length === 0) return; // nothing found

  doCreateElement(doc, "hr", null, null, null, parentDiv);
  const infoDiv = doCreateElement(doc, "div", "tc-recentsentences", null, null, parentDiv);

  const sentsDiv = doCreateElement(
    doc,
    "div",
    "tc-recentsentences-header",
    "Similar examples",
    null,
    infoDiv,
  );
  const uCardWords = await getUserCardWords();
  for (const pr of posRecents) {
    for (const t of pr.sentence.t) {
      if (t.l == token.l && t.pos === token.pos) {
        t.style = { color: "green", "font-weight": "bold" };
      }
    }
    const entryDiv = doCreateElement(doc, "div", "tc-recentsentences-entry", " - ", null, sentsDiv);
    const textBlock = await generateSentences(doc, [pr.sentence], uCardWords, false);
    entryDiv.appendChild(textBlock);
  }
  doCreateElement(doc, "hr", null, null, null, sentsDiv);
}

function printInfosRx(doc: Document, wordInfo: DefinitionType, parentDiv: HTMLElement) {
  // FIXME: this is no longer generic, and will need rewriting... later
  const infoDiv = doCreateElement(doc, "div", "tc-stats", null, null, parentDiv);
  let meta = "HSK";
  if (wordInfo.hsk.levels && wordInfo.hsk.levels.length > 0) {
    const infoElem = doCreateElement(doc, "div", "tc-" + meta + "s", null, null, infoDiv);
    doCreateElement(
      doc,
      "div",
      "tc-" + meta,
      `HSK: ${wordInfo.hsk.levels.join(", ")}`,
      null,
      infoElem,
    );
  } else {
    doCreateElement(doc, "div", "tc-" + meta, "No " + meta + " found", null, infoDiv);
  }
  meta = "Frequency";
  const frq = wordInfo.frequency;
  if (frq.wcpm) {
    const infoElem = doCreateElement(doc, "div", "tc-" + meta + "s", null, null, infoDiv);
    // const vals = `Frequency: wcpm: ${frq.wcpm}, wcdp: ${frq.wcdp}, pos: ${frq.pos}, pos freq: ${frq.posFreq}`;
    const vals = `Frequency: wcpm: ${frq.wcpm}, wcdp: ${frq.wcdp}`;
    doCreateElement(doc, "div", "tc-" + meta, vals, null, infoElem);
  } else {
    doCreateElement(doc, "div", "tc-" + meta, "No " + meta + " found", null, infoDiv);
  }
}

function printSynonymsRx(
  doc: Document,
  wordInfo: DefinitionType,
  token: TokenType,
  parentDiv: HTMLElement,
) {
  // TODO: maybe show that there are none?

  if (!token.pos) return;
  const pos = utils.toSimplePos(token.pos);
  const syns = wordInfo.synonyms.filter((x) => x.posTag === pos);
  if (!syns || syns.length === 0) {
    return;
  }

  const synonymsDiv = doCreateElement(doc, "div", "tc-synonyms", null, null, parentDiv);

  doCreateElement(doc, "hr", null, null, null, synonymsDiv);
  doCreateElement(doc, "div", "tc-synonym-list", syns[0].values.join(", "), null, synonymsDiv);
}

function printPosRx(doc: Document, token: TokenType, parentDiv: HTMLElement) {
  if (!token.pos) return;
  const pos = utils.toPosLabels(token.pos);
  const posDiv = doCreateElement(doc, "div", "tc-pos", null, null, parentDiv);
  doCreateElement(doc, "hr", null, null, null, posDiv);
  doCreateElement(doc, "div", null, `POS: ${pos}`, null, posDiv);
}

function printActionsRx(
  doc: Document,
  wordInfo: DefinitionType,
  token: TokenType,
  parentDiv: HTMLElement,
  originElement: HTMLElement,
) {
  doCreateElement(doc, "hr", null, null, null, parentDiv);
  const actionsDiv = doCreateElement(doc, "div", "tcrobe-def-actions", null, null, parentDiv);
  for (const [grade, gradeObj] of Object.entries(GRADE_SVGS))
    createSVG(
      gradeObj[0],
      null,
      [
        ["title", gradeObj[1]],
        ["width", "32"],
        ["height", "32"],
      ],
      actionsDiv,
    ).addEventListener("click", (event) =>
      addOrUpdateCards(event, wordInfo, token, parseInt(grade), originElement),
    );
}

function popupDefinitionsRx(doc: Document, wordInfo: DefinitionType, popupContainer: HTMLElement) {
  for (const provider of wordInfo.providerTranslations) {
    if (provider.posTranslations.length === 0) continue;

    popupContainer.appendChild(doCreateElement(doc, "hr", "tcrobe-def-hr", null, null));
    const defSource = doCreateElement(doc, "div", "tcrobe-def-source", null, null, popupContainer);
    doCreateElement(doc, "div", "tcrobe-def-source-name", provider.provider, null, defSource);

    for (const translation of provider.posTranslations) {
      if (translation.values.length === 0) continue;

      defSource.appendChild(
        doCreateElement(
          doc,
          "div",
          "tcrobe-def-source-pos",
          utils.toSimplePosLabels(translation.posTag as SIMPLE_POS_TYPES),
          null,
        ),
      );
      const defSourcePosDefs = doCreateElement(
        doc,
        "div",
        "tcrobe-def-source-pos-defs",
        null,
        null,
        defSource,
      );
      defSourcePosDefs.appendChild(
        doCreateElement(doc, "span", "tcrobe-def-source-pos-def", translation.values.join(", ")),
      );
    }
  }
}

function destroyPopup(event: MouseEvent, doc: Document, popupParent: Document): boolean {
  const currentTarget = doc.querySelector(".tcrobe-popup-target");
  if (currentTarget) {
    currentTarget.classList.remove("tcrobe-popup-target");
    event.stopPropagation(); // we don't want other events, but we DO want the default, for clicking on links
    popupParent.querySelectorAll("token-details").forEach((el) => el.remove());
    return true;
  }

  // clear any existing popups
  popupParent.querySelectorAll("token-details").forEach((el) => el.remove());
  return false;
}

function populateMouseover(
  event: MouseEvent,
  doc: Document,
  uCardWords: DayCardWords,
  token: TokenType,
) {
  const target = event.target! as HTMLElement;
  if (target && target.dataset.tcrobeEntry) {
    if (!timeoutId) {
      timeoutId = window.setTimeout(() => {
        if (target.dataset.tcrobeEntry) {
          const word = JSON.parse(target.dataset.tcrobeEntry) as TokenType;
          const userEvent = {
            type: "bc_word_lookup",
            data: {
              target_word: word.l,
              target_sentence: target.parentElement?.dataset.sentCleaned,
            },
            userStatsMode: utils.glossing,
            source: EVENT_SOURCE,
          };
          platformHelper.sendMessage({
            source: DATA_SOURCE,
            type: "submitUserEvents",
            value: userEvent,
          });

          timeoutId = 0;
        }
      }, MIN_LOOKED_AT_EVENT_DURATION);
    }
  }
  getPopoverText(token, uCardWords).then((popoverText) => {
    const popup = doCreateElement(doc, "div", "tc-mouseover-popup", popoverText, null);
    const pstyle =
      "min-width: 120px; margin-left: -60px; bottom: 100%; left: 50%; background-color: black; color: #fff; text-align: center; padding: 5px 0; border-radius: 6px; position: absolute; z-index: 1;";
    popup.setAttribute("style", pstyle);
    target.append(popup);
  });
}

function populatePopup(event: MouseEvent, doc: Document) {
  const parent = (event.target! as HTMLElement).parentElement;
  if (parent && parent.dataset.tcrobeEntry) {
    const word = JSON.parse(parent.dataset.tcrobeEntry) as TokenType;
    const userEvent = {
      type: "bc_word_lookup",
      data: {
        target_word: word.l,
        target_sentence: parent.parentElement?.dataset.sentCleaned,
      },
      userStatsMode: utils.glossing,
      source: EVENT_SOURCE,
    };
    platformHelper.sendMessage({ source: DATA_SOURCE, type: "submitUserEvents", value: userEvent });
  }
  // We clicked on the same element twice, it's probably a link, so we shouldn't try and do any more
  // In any case, we close the popup
  const currentTarget = doc.querySelector(".tcrobe-popup-target");
  if (currentTarget) {
    currentTarget.classList.remove("tcrobe-popup-target");
    // clear any existing popups
    popupParent.ownerDocument.querySelectorAll("token-details").forEach((el) => el.remove());
    if (currentTarget === event.target) {
      event.stopPropagation(); // we don't want other events, but we DO want the default, for clicking on links
      return null;
    }
  }
  // set the new popup target
  (event.target as HTMLElement).classList.add("tcrobe-popup-target");
  const popup = doCreateElement(doc, "token-details", null, null, null, popupParent);
  popup.setAttribute("theme-css-url", platformHelper.getURL("transcrobes.css"));
  popup.setAttribute("theme-name", utils.themeName);

  // stop the other events
  event.stopPropagation();
  event.preventDefault();

  // position the html block
  const eventX = event.clientX;

  const eventY = event.pageY;

  // place the popup just under the clicked item
  popup.style.display = "block";
  // added for readium
  popup.style.position = "absolute";

  const popupWidth = popup.getBoundingClientRect().width;

  if (eventX < popupWidth / 2) {
    popup.style.left = "0px";
  } else if (popupParent.ownerDocument.documentElement.clientWidth < eventX + popupWidth / 2) {
    // } else if (document.documentElement.clientWidth < (eventX + (width / 2)) ) {
    // popup.style.left = `${document.documentElement.clientWidth - width}px`;
    popup.style.left = `${popupParent.ownerDocument.documentElement.clientWidth - popupWidth}px`;
  } else {
    popup.style.left = `${eventX - popupWidth / 2}px`;
  }
  let translateDown = 20;

  if (window.frameElement && window.frameElement.getBoundingClientRect) {
    translateDown += window.frameElement.getBoundingClientRect().top;
  }
  popup.style.top = `${eventY + translateDown}px`;

  const fsElem = document.fullscreenElement || window.parent.document.fullscreenElement;
  if (fsElem) {
    const maxHeight = fsElem.getBoundingClientRect().height - popup.getBoundingClientRect().top;
    if (popup.getBoundingClientRect().height > maxHeight) {
      popup.style.height = `${maxHeight}px`;
    }
  }
  return popup;
}

async function getL2Simplified(
  token: TokenType,
  previousGloss: string,
  uCardWords: DayCardWords,
): Promise<string> {
  let gloss = previousGloss;
  // server-side set user known synonym
  if (token.us && token.us.length > 0) {
    gloss = token.us[0];
  } else {
    // try and get a local user known synonym
    const dictDefinition =
      (token.id && window.cachedDefinitions.get(token.id.toString())) || (await getWord(token.l));
    const syns = dictDefinition.synonyms.filter((x) => x.posTag === utils.toSimplePos(token.pos!));

    let innerGloss;
    if (syns && syns.length > 0) {
      const userSynonyms = utils.filterKnown(
        uCardWords.knownWordIdsCounter,
        uCardWords.knownCardWordGraphs,
        syns[0].values,
      );
      if (userSynonyms.length > 0) {
        innerGloss = userSynonyms[0];
      }
    }
    gloss = innerGloss || gloss || bestGuess(token, dictDefinition);
  }
  return gloss;
}
async function getL1(token: TokenType): Promise<string> {
  let gloss = token.bg ? token.bg.split(",")[0].split(";")[0] : "";
  if (gloss) return gloss;

  const dictDefinition =
    (token.id && window.cachedDefinitions.get(token.id.toString())) || (await getWord(token.l));
  // FIXME: need to add a timer or something to the dom element to keep
  // looking for the actual definition when it arrives
  if (dictDefinition && dictDefinition.providerTranslations) {
    gloss = bestGuess(token, dictDefinition);
  } else {
    gloss = "loading...";
  }

  return gloss;
}
async function getSound(token: TokenType): Promise<string> {
  let gloss = "";
  if (token.p) {
    gloss = token.p.join("");
  } else {
    gloss = (
      (token.id && window.cachedDefinitions.get(token.id.toString())) ||
      (await getWord(token.l))
    ).sound.join("");
  }
  return gloss;
}

async function getPopoverText(token: TokenType, uCardWords: DayCardWords): Promise<string> {
  const l1 = await getL1(token);
  const l2 = await getL2Simplified(token, l1, uCardWords);
  const sound = await getSound(token);
  return `${utils.complexPosToSimplePosLabels(token.pos!)}: ${l1} ${
    l2 != l1 ? `: ${l2}` : ""
  }: ${sound}`;
}

async function updateWordForEntry(
  entry: HTMLElement,
  glossing: number,
  entryPadding: boolean,
  tokenData: TokenType,
  doc: Document,
  uCardWords: DayCardWords,
  glossNumberNouns = false,
  addClick = true,
  addMouseInOut = true,
): Promise<HTMLElement> {
  entry.dataset.tcrobeEntry = JSON.stringify(tokenData);
  const token = tokenData; // || (JSON.parse(entry.dataset.tcrobeEntry!) as TokenType);
  if (entryPadding) {
    // FIXME: this should be the class but how do i make it variable? with css variables?
    entry.style.paddingLeft = `${(SEGMENTED_BASE_PADDING * utils.fontSize) / 100}px`; // should this be padding or margin?
  }
  if (token.style) {
    for (const [name, value] of Object.entries(token.style)) {
      (entry.style as any)[name] = value;
    }
  }

  const lemma = token.l;
  const word = doCreateElement(doc, "span", "tcrobe-word", lemma, null);
  entry.appendChild(word);
  if (addClick) {
    entry.addEventListener("click", (event: MouseEvent) => {
      populatePopup(event, doc);
    });
  }
  if (addMouseInOut) {
    entry.addEventListener("mouseenter", (event: MouseEvent) => {
      populateMouseover(event, doc, uCardWords, token);
    });
    entry.addEventListener("mouseleave", () => {
      if (timeoutId) {
        window.clearTimeout(timeoutId);
        timeoutId = 0;
      }
      // TODO: understand why the F document.querySelectorAll DOESN'T work, while entry.querySelectorAll does...
      const daf = entry.querySelectorAll(".tc-mouseover-popup");
      daf.forEach((el) => {
        el.remove();
      });
    });
  }

  const needsGloss =
    glossing > USER_STATS_MODE.NO_GLOSS &&
    !uCardWords.knownCardWordGraphs.has(lemma) &&
    !!token.pos &&
    (token.pos !== "NT" || glossNumberNouns);

  if (needsGloss) {
    // Default L1, context-aware, "best guess" gloss
    let gloss = token.bg ? token.bg.split(",")[0].split(";")[0] : "";

    if (glossing == USER_STATS_MODE.L1 && !gloss) {
      gloss = await getL1(token);
    }
    if (glossing == USER_STATS_MODE.L2_SIMPLIFIED) {
      gloss = await getL2Simplified(token, gloss, uCardWords);
    } else if (glossing == USER_STATS_MODE.TRANSLITERATION) {
      gloss = await getSound(token);
    }
    word.dataset.tcrobeGloss = gloss;
    word.classList.add("tcrobe-gloss");
  } else {
    word.classList.remove("tcrobe-gloss");
  }
  return entry;
}

function doCreateElement(
  doc: Document,
  elType: string,
  elClass?: string | null,
  elInnerText?: string | null,
  elAttrs?: [string, string][] | null,
  elParent?: HTMLElement,
): HTMLElement {
  if (!elType) {
    throw new Error("eltype must be an element name");
  }
  const el = doc.createElement(elType);
  if (elClass) {
    const arr = Array.isArray(elClass) ? elClass : elClass.split(" ");
    arr.forEach((cssClass) => el.classList.add(cssClass));
  }
  if (elInnerText) {
    el.textContent = elInnerText;
  }
  if (elAttrs) {
    for (const attr of elAttrs) {
      el.setAttribute(attr[0], attr[1]);
    }
  }
  if (elParent) {
    elParent.appendChild(el);
  }
  return el;
}

function toggleSentenceVisible(event: MouseEvent, l1Sentence: HTMLElement) {
  const parent = (event.target as HTMLElement).parentElement;
  if (parent && l1Sentence.classList.contains("hidden")) {
    const userEvent = {
      type: "bc_sentence_lookup",
      data: {
        target_word: parent.dataset.tcrobeWord,
        target_sentence: parent.dataset.sentCleaned,
      },
      userStatsMode: utils.glossing,
      source: EVENT_SOURCE,
    };
    platformHelper.sendMessage({ source: DATA_SOURCE, type: "submitUserEvents", value: userEvent });
  }
  l1Sentence.classList.toggle("hidden");
  if (parent) {
    if (!l1Sentence.dataset.sentTrans) {
      if (parent.dataset.sentCleaned)
        platformHelper
          .sendMessagePromise<string>({
            source: DATA_SOURCE,
            type: "sentenceTranslation",
            value: parent.dataset.sentCleaned,
          })
          .then((translation) => {
            const obj = l1Sentence.querySelector(".tcrobe-def-sentence");
            if (obj) {
              (obj as HTMLElement).dataset.sentTrans = translation;
              obj.innerHTML = translation;
            }
          });
    }
    if (parent.dataset.tcToken) {
      const obj = l1Sentence.querySelector(".tcrobe-def-recentsentences");
      if (obj) {
        obj.innerHTML = "";
        printRecentExamplesRx(document, JSON.parse(parent.dataset.tcToken), obj as HTMLElement);
      }
    }
    for (const button of parent.querySelectorAll("svg")) {
      button.classList.toggle("hidden");
    }
  }
  event.stopPropagation();
}

const popupStyle = `
  hr {
  	margin: 0;
  }
  .tcrobe-def-popup {
  	text-align: center;
  	border-radius: 6px;
  	padding: 3px 0;
    z-index: 99999;
    padding: 5px;
    max-width: 90%;
    min-width: 180px;
    opacity: 1;
  }
  @media (min-width: 400px) {
    .tcrobe-def-popup {
      max-width: 380px;
    }
  }
  .tcrobe-def-container { text-align: left; }
  .tc-recentsentences-entry { text-align: left; }
  .tcrobe-def-source { margin-left: 6px; padding: 5px 0; }
  .tcrobe-def-source-name { box-sizing: border-box; text-align: left; }
  .tcrobe-def-source-pos { margin-left: 12px; }
  .tcrobe-def-source-pos-defs { margin-left: 18px; padding: 0 0 0 5px; }
  .tcrobe-def-header { box-sizing: border-box; display: flex; justify-content: space-between; }
  .tcrobe-def-actions { box-sizing: border-box; padding-bottom: 4px; display: flex; justify-content: space-around; }
  .tcrobe-def-pinyin { box-sizing: border-box; padding: 2px; }
  .tcrobe-def-best { box-sizing: border-box; padding: 2px; }
  .tcrobe-def-sentbutton { box-sizing: border-box; padding: 2px; }
`;

class TokenDetails extends HTMLParsedElement {
  static get observedAttributes(): ["theme-css-url", "theme-name"] {
    return ["theme-css-url", "theme-name"];
  }

  setThemes(name: string, newValue: string): void {
    if (name === "theme-name") {
      this.shadowRoot.querySelector(".tcrobe-def-popup").classList.add(newValue);
    } else {
      if (!this.shadowRoot.querySelector("style")) {
        const style = document.createElement("style");
        style.textContent = `
          ${TranscrobesCSS}
          ${popupStyle}
        `;

        this.shadowRoot.appendChild(style);
      }
    }
  }

  attributeChangedCallback(name: string, _oldValue: string, newValue: string): void {
    this.setThemes(name, newValue);
  }

  constructor() {
    super();
    this.attachShadow({ mode: "open" });
  }

  connectedCallback(): void {
    this.init();
  }

  init(): void {
    const doc: Document = document; // does it matter where we create, or just attach???

    const popup = doc.createElement("div");
    popup.innerHTML = "Loading...";
    popup.classList.add("tcrobe-def-popup");
    popup.classList.add("loader");
    this.shadowRoot.appendChild(popup);

    const target = doc.querySelector(".tcrobe-popup-target") as HTMLElement;
    const sentenceEl = target?.closest(".tcrobe-sent") as HTMLElement;
    const entryEl = target?.closest(".tcrobe-entry") as HTMLElement;
    if (!target || !sentenceEl || !entryEl || !entryEl.dataset.tcrobeEntry) {
      throw new Error("Impossible to properly attach popup");
    }
    const token = JSON.parse(entryEl.dataset.tcrobeEntry) as TokenType;
    // create the html block

    // If the word definition is cached. It won't be (yet) for the "loading..." case
    let promise: Promise<DefinitionType> | null = null;
    if (token.id && window.cachedDefinitions.has(token.id.toString())) {
      promise = Promise.resolve(window.cachedDefinitions.get(token.id.toString())!);
    } else {
      console.warn("Token is not in the cache", token, [...window.cachedDefinitions.values()]);
      promise = platformHelper.sendMessagePromise<DefinitionType>({
        source: DATA_SOURCE,
        type: "getWordFromDBs",
        value: token.l,
      });
    }
    promise.then((wordInfo) => {
      popup.innerHTML = "";
      popup.classList.remove("loader");

      const defHeader = doCreateElement(doc, "div", "tcrobe-def-header", null, null, popup);
      defHeader.appendChild(
        doCreateElement(
          doc,
          "div",
          "tcrobe-def-pinyin",
          // prefer the potentially server version, which might have been deep transliterated
          (token.p || wordInfo.sound).join(""),
          null,
        ),
      );
      defHeader.appendChild(
        doCreateElement(
          doc,
          "div",
          "tcrobe-def-best",
          token.bg ? token.bg.split(",")[0].split(";")[0] : bestGuess(token, wordInfo),
          null,
        ),
      );

      const sentButton = doCreateElement(
        doc,
        "div",
        "tcrobe-def-sentbutton",
        null,
        null,
        defHeader,
      );
      sentButton.dataset.sentCleaned = sentenceEl.dataset.sentCleaned;
      sentButton.dataset.tcrobeWord = token.l;
      sentButton.dataset.tcToken = JSON.stringify(token);

      const popupExtras = doCreateElement(
        doc,
        "div",
        "tcrobe-def-extras hidden",
        null,
        null,
        popup,
      );
      const sentTrans = sentenceEl.dataset.sentTrans || "loading...";
      const sentTransDiv = doCreateElement(
        doc,
        "div",
        "tcrobe-def-sentence",
        sentTrans,
        null,
        popupExtras,
      );
      if (sentenceEl.dataset.sentTrans) {
        sentTransDiv.dataset.sentTrans = sentTrans;
      }

      doCreateElement(doc, "div", "tcrobe-def-recentsentences", "", null, popupExtras);
      doCreateElement(doc, "div", "tcrobe-def-messages hidden", null, null, popup);

      createSVG(
        SVG_SOLID_EXPAND,
        null,
        [
          ["title", "See translated sentence"],
          ["width", "32"],
          ["height", "32"],
        ],
        sentButton,
      ).addEventListener("click", (event) => {
        toggleSentenceVisible(event, popupExtras);
      });
      createSVG(
        SVG_SOLID_COMPRESS,
        "hidden",
        [
          ["title", "Hide translated sentence"],
          ["width", "32"], // FIXME: nasty hardcoding
          ["height", "32"],
        ],
        sentButton,
      ).addEventListener("click", (event) => {
        toggleSentenceVisible(event, popupExtras);
      });

      const popupContainer = doCreateElement(doc, "div", "tcrobe-def-container", null, null, popup);
      printInfosRx(doc, wordInfo, popupContainer);
      printPosRx(doc, token, popupContainer);
      printSynonymsRx(doc, wordInfo, token, popupContainer);
      printActionsRx(doc, wordInfo, token, popupContainer, target);
      popupDefinitionsRx(doc, wordInfo, popupContainer);
      return "";
    });
  }
}

class EnrichedTextFragment extends HTMLParsedElement {
  static get observedAttributes(): ["data-model", "id"] {
    return ["data-model", "id"];
  }

  ensureStyle(): void {
    // Global style for glosses
    if (document.body && !document.querySelector("#transcrobesInjectedStyle")) {
      const rtStyle = document.createElement("style");
      rtStyle.id = "transcrobesInjectedStyle";
      rtStyle.textContent = `
        token-details {
          position: absolute; z-index: 99999;
        }
        .tcrobe-entry { position: relative; cursor: pointer; }
        span.tcrobe-word.tcrobe-gloss::after {
          content: ' (' attr(data-tcrobe-gloss) ')';
        }`;
      document.body.appendChild(rtStyle);
    }
  }

  constructor() {
    super();
    // FIXME: how to best get the document???
    this.doc = document;
  }

  async connectedCallback(): Promise<void> {
    this.ensureStyle();
    let sentences: SentenceType[] | null = null;
    const localModel: ModelType | null =
      "model" in this.dataset ? JSON.parse(this.dataset.model) : null;
    if (localModel && localModel["s"].length > 0) {
      sentences = localModel["s"];
    } else if (this.id) {
      sentences = window.transcrobesModel[this.id]["s"];
    }
    if (sentences) {
      const uCardWords = await getUserCardWords();
      if (uCardWords == null) {
        throw new Error("uCardWords is null in connectedCallback");
      }
      // FIXME: this doesn't work in chrome extensions with polyfills it seems,
      // so that means we can't have text there and then replace. And this is all
      // because the chrome devs have some philosophical issue with allowing proper components
      // in extensions. The argument on the 7-year old issue is typical Google...
      // this.getRootNode().innerText = '';

      if (!this.querySelector(".tcrobe-sent")) {
        const textBlock = await generateSentences(this.doc, sentences, uCardWords, true);
        this.innerHTML = "";
        this.appendChild(textBlock);

        window.etfLoaded.add("loaded");
        readObserver.observe(this as unknown as Element); // FIXME: there are no types for HTMLParsedElement
      }
    }
  }

  async attributeChangedCallback(name: string, _oldValue: string, newValue: string): Promise<void> {
    this.ensureStyle();
    let sentences: SentenceType[] = [];
    if (name === "data-model") {
      sentences = JSON.parse(newValue)["s"];
    } else if (name === "id") {
      sentences = window.transcrobesModel[this.id]["s"];
    } else {
      console.error("Unable to find model sentences: attributeChangedCallback");
    }
    if (sentences) {
      const uCardWords = await getUserCardWords();
      if (uCardWords == null) {
        throw new Error("uCardWords is null in attributeChangedCallback");
      }
      if (!this.querySelector(".tcrobe-sent")) {
        const textBlock = await generateSentences(this.doc, sentences, uCardWords, true);
        this.innerHTML = "";
        this.appendChild(textBlock);

        window.etfLoaded.add("loaded");
        readObserver.observe(this as unknown as Element); // FIXME: there are no types for HTMLParsedElement
      }
    }
  }
}

function defineElements(): void {
  window.etfLoaded = new Set();
  if (!customElements.get("token-details")) {
    // FIXME: no types for HTMLParsedElement
    customElements.define("token-details", TokenDetails as unknown as CustomElementConstructor);
  }
  if (!customElements.get("enriched-text-fragment")) {
    customElements.define(
      "enriched-text-fragment",
      // FIXME: no types for HTMLParsedElement
      EnrichedTextFragment as unknown as CustomElementConstructor,
    );
  }
}

export {
  setPlatformHelper,
  setPopupParent,
  defineElements,
  getUserCardWords,
  destroyPopup,
  createSVG,
  onScreen,
  EnrichedTextFragment,
  TokenDetails,
  SVG_HAPPY_4,
  SVG_SAD,
  SVG_SAD_7,
  SVG_SOLID_CHECK,
  SVG_SOLID_COMPRESS,
  SVG_SOLID_EXPAND,
  SVG_SOLID_PLUS,
};

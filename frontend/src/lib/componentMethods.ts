import { bestGuess, complexPosToSimplePosLabels, filterKnown, toSimplePos } from "./libMethods";
import { platformHelper } from "./proxies";
import {
  BOOCROBES_HEADER_HEIGHT,
  DefinitionsState,
  DefinitionType,
  EventCoordinates,
  InputLanguage,
  PopupPosition,
  ReaderState,
  RecentSentencesType,
  SentenceType,
  SerialisableDayCardWords,
  TokenType,
  TreebankPosType,
  USER_STATS_MODE,
} from "./types";

const DEFINITION_LOADING = "loading...";
const DATA_SOURCE = "componentMethods.ts";
const NUMBER_POS = new Set<TreebankPosType>(["OD", "NT", "CD"]);

export async function getWord(lemma: string): Promise<DefinitionType> {
  return platformHelper.sendMessagePromise<DefinitionType>({
    source: DATA_SOURCE,
    type: "getWordFromDBs",
    value: lemma,
  });
}

export async function getL1(
  token: TokenType,
  definitions: DefinitionsState,
  fromLang: InputLanguage,
  readerConfig: ReaderState,
  defaultL1: string,
): Promise<string> {
  if (defaultL1 && !readerConfig.strictProviderOrdering) return defaultL1;
  let gloss = defaultL1;
  const dictDefinition = (token.id && definitions[token.id]) || (await getWord(token.l));
  // FIXME: need to add a timer or something to the dom element to keep
  // looking for the actual definition when it arrives
  if (dictDefinition && dictDefinition.providerTranslations) {
    gloss = bestGuess(token, dictDefinition, fromLang, readerConfig);
  } else {
    gloss = DEFINITION_LOADING;
  }

  return gloss || defaultL1;
}

export async function getSound(token: TokenType, definitions: DefinitionsState): Promise<string> {
  let gloss = "";
  if (token.p) {
    gloss = token.p.join("");
  } else {
    gloss = ((token.id && definitions[token.id]) || (await getWord(token.l)))?.sound.join("") || DEFINITION_LOADING;
  }
  return gloss;
}

export async function getNormalGloss(
  token: TokenType,
  readerConfig: ReaderState,
  uCardWords: Partial<SerialisableDayCardWords>,
  definitions: DefinitionsState,
  fromLang: InputLanguage,
): Promise<string> {
  // Default L1, context-aware, "best guess" gloss
  const { glossing } = readerConfig;
  let gloss = token.bg ? token.bg.split(",")[0].split(";")[0] : "";
  if (glossing == USER_STATS_MODE.L1) {
    gloss = await getL1(token, definitions, fromLang, readerConfig, gloss);
  } else if (glossing == USER_STATS_MODE.L2_SIMPLIFIED) {
    gloss = await getL2Simplified(token, gloss, uCardWords, definitions, fromLang, readerConfig);
  } else if (glossing == USER_STATS_MODE.TRANSLITERATION) {
    gloss = await getSound(token, definitions);
  } else if (glossing == USER_STATS_MODE.TRANSLITERATION_L1) {
    gloss = `${await getSound(token, definitions)}: ${await getL1(token, definitions, fromLang, readerConfig, gloss)}`;
  }
  return gloss;
}

export async function getTranslation(input: SentenceType): Promise<string> {
  return await platformHelper.sendMessagePromise<string>({
    source: DATA_SOURCE,
    type: "sentenceTranslation",
    value: originalSentenceFromTokens(input.t),
  });
}

export async function getRecentSentences(
  token: TokenType,
  definition: DefinitionType,
): Promise<RecentSentencesType | null> {
  if (!token.pos || !token.id) return null;
  const existingRSents = new Map<string, RecentSentencesType>(
    await platformHelper.sendMessagePromise<Array<[string, RecentSentencesType]>>({
      source: DATA_SOURCE,
      type: "getRecentSentences",
      value: [definition.id],
    }),
  );
  const recents = existingRSents.get(definition.id);
  if (!recents) return null; // nothing found
  const posRecents = recents.posSentences[token.pos];
  if (!posRecents || posRecents.length === 0) return null; // nothing found

  for (const pr of posRecents) {
    for (const t of pr.sentence.t) {
      if (t.l == token.l && t.pos === token.pos) {
        t.style = { color: "green", "font-weight": "bold" };
      }
    }
  }

  return { id: token.id, posSentences: { [token.pos]: posRecents } };
}

function originalSentenceFromTokens(tokens: TokenType[]): string {
  // currently just use
  return tokens.map((x) => x.l).join("");
}

async function getL2Simplified(
  token: TokenType,
  previousGloss: string,
  uCardWords: Partial<SerialisableDayCardWords>,
  definitions: DefinitionsState,
  fromLang: InputLanguage,
  readerConfig: ReaderState,
): Promise<string> {
  let gloss = previousGloss;
  // server-side set user known synonym
  if (token.us && token.us.length > 0) {
    gloss = token.us[0];
  } else {
    // try and get a local user known synonym
    const dictDefinition = (token.id && definitions[token.id]) || (await getWord(token.l));
    if (!dictDefinition) return DEFINITION_LOADING;
    const syns = dictDefinition.synonyms.filter(
      (x) => toSimplePos(x.posTag, fromLang) === toSimplePos(token.pos!, fromLang),
    );

    let innerGloss;
    if (syns && syns.length > 0) {
      const userSynonyms = filterKnown(
        uCardWords.knownWordIdsCounter || {},
        uCardWords.knownCardWordGraphs || {},
        syns[0].values,
      );
      if (userSynonyms.length > 0) {
        innerGloss = userSynonyms[0];
      }
    }
    gloss = innerGloss || gloss || bestGuess(token, dictDefinition, fromLang, readerConfig);
  }
  return gloss;
}

export function isNumberToken(token: TokenType): boolean {
  return !!token.pos && NUMBER_POS.has(token.pos);
}
export async function getPopoverText(
  token: TokenType,
  uCardWords: Partial<SerialisableDayCardWords>,
  definitions: DefinitionsState,
  fromLang: InputLanguage,
  readerConfig: ReaderState,
): Promise<string> {
  const gloss = token.bg ? token.bg.split(",")[0].split(";")[0] : "";
  const l1 = await getL1(token, definitions, fromLang, readerConfig, gloss);
  if (l1 === DEFINITION_LOADING) return DEFINITION_LOADING;
  const l2 = await getL2Simplified(token, l1, uCardWords, definitions, fromLang, readerConfig);
  const sound = await getSound(token, definitions);
  return `${complexPosToSimplePosLabels(token.pos!, fromLang)}: ${l1} ${l2 != l1 ? `: ${l2}` : ""}: ${sound}`;
}

export function eventCoordinates(event: React.MouseEvent<HTMLElement>): EventCoordinates {
  return {
    eventX: window.frameElement ? event.clientX : event.pageX,
    eventY: window.frameElement ? event.clientY + BOOCROBES_HEADER_HEIGHT : event.pageY,
  };
}

export function positionPopup(
  popupWidth: number,
  eventX: number,
  eventY: number,
  popupParent: HTMLElement,
): PopupPosition {
  const position: PopupPosition = {
    left: "",
    top: "",
  };

  const maxWidth = Math.max(
    popupParent.ownerDocument.documentElement.scrollWidth,
    popupParent.ownerDocument.documentElement.clientWidth,
  );

  if (eventX < popupWidth / 2) {
    position.left = window.scrollX + "px";
  } else if (maxWidth < eventX + popupWidth / 2) {
    const clientWidth = popupParent.ownerDocument.documentElement.clientWidth;
    position.left = `${window.scrollX + clientWidth - popupWidth}px`;
  } else {
    const left = Math.max(window.scrollX, eventX - popupWidth / 2);
    const again = Math.min(left, window.scrollX + popupParent.ownerDocument.documentElement.clientWidth - popupWidth);
    position.left = `${again}px`;
  }
  let translateDown = 20;
  if (window.frameElement) {
    translateDown += BOOCROBES_HEADER_HEIGHT;
  }
  position.top = `${eventY + translateDown}px`;
  return position;
}

import { bestGuess, complexPosToSimplePosLabels, filterKnown, toSimplePos } from "./libMethods";
import { platformHelper } from "./proxies";
import {
  AnyTreebankPosType,
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
  SystemLanguage,
  TokenType,
  USER_STATS_MODE,
} from "./types";

const DEFINITION_LOADING = "loading...";
const DATA_SOURCE = "componentMethods.ts";
const NUMBER_POS = new Set<AnyTreebankPosType>(["OD", "NT", "CD"]);

export async function getWord(lemma: string): Promise<DefinitionType> {
  return platformHelper.sendMessagePromise<DefinitionType>({
    source: DATA_SOURCE,
    type: "getWordFromDBs",
    value: lemma,
  });
}

export async function getDefinitions(token: TokenType, definitions: DefinitionsState) {
  let defIds: string[] = [];
  let defs: DefinitionType[] = [];
  if (token.id) {
    defIds.push(token.id);
  }
  if (token.oids) {
    defIds = defIds.concat(token.oids);
  }
  for (const defId of defIds) {
    const def = definitions[defId];
    if (def) {
      defs.push(def);
    }
  }
  return defs || [await getWord(token.l)];
}

export async function getL1(
  token: TokenType,
  definitions: DefinitionsState,
  fromLang: InputLanguage,
  toLang: SystemLanguage,
  readerConfig: ReaderState,
  defaultL1: string,
): Promise<string> {
  if (defaultL1 && !readerConfig.strictProviderOrdering) return defaultL1;
  let gloss = defaultL1;
  const defs = await getDefinitions(token, definitions);
  if (defs[0] && defs[0].providerTranslations) {
    gloss = bestGuess(token, defs, fromLang, toLang, readerConfig);
  } else {
    gloss = DEFINITION_LOADING;
  }

  return gloss || defaultL1;
}

export async function getSound(token: TokenType, definitions: DefinitionsState): Promise<string[]> {
  return token.p || ((token.id && definitions[token.id]) || (await getWord(token.l)))?.sound || [DEFINITION_LOADING];
}

export async function getNormalGloss(
  token: TokenType,
  readerConfig: ReaderState,
  uCardWords: Partial<SerialisableDayCardWords>,
  definitions: DefinitionsState,
  fromLang: InputLanguage,
  toLang: SystemLanguage,
): Promise<string> {
  // Default L1, context-aware, "best guess" gloss
  const { glossing } = readerConfig;
  let gloss = token.bg ? token.bg.split(",")[0].split(";")[0] : "";
  if (glossing == USER_STATS_MODE.L1) {
    gloss = await getL1(token, definitions, fromLang, toLang, readerConfig, gloss);
  } else if (glossing == USER_STATS_MODE.L2_SIMPLIFIED) {
    gloss = await getL2Simplified(token, gloss, uCardWords, definitions, fromLang, toLang, readerConfig);
  } else if (glossing == USER_STATS_MODE.TRANSLITERATION) {
    gloss = (await getSound(token, definitions)).join("");
  } else if (glossing == USER_STATS_MODE.TRANSLITERATION_L1) {
    gloss = `${(await getSound(token, definitions)).join("")}: ${await getL1(
      token,
      definitions,
      fromLang,
      toLang,
      readerConfig,
      gloss,
    )}`;
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
  toLang: SystemLanguage,
  readerConfig: ReaderState,
): Promise<string> {
  let gloss = previousGloss;
  // server-side set user known synonym
  if (token.us && token.us.length > 0) {
    gloss = token.us[0];
  } else {
    // try and get a local user known synonym
    // const dictDefinition = (token.id && definitions[token.id]) || (await getWord(token.l));
    const defs = await getDefinitions(token, definitions);
    if (!defs[0]) return DEFINITION_LOADING;
    // FIXME: should I just be using the first here? why? why not?
    const syns = defs[0].synonyms.filter((x) => toSimplePos(x.posTag, fromLang) === toSimplePos(token.pos!, fromLang));

    let innerGloss: string | undefined;
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
    gloss = innerGloss || gloss || bestGuess(token, defs, fromLang, toLang, readerConfig);
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
  systemLang: SystemLanguage,
  readerConfig: ReaderState,
): Promise<string> {
  const gloss = token.bg ? token.bg.split(",")[0].split(";")[0] : "";
  const l1 = await getL1(token, definitions, fromLang, systemLang, readerConfig, gloss);
  if (l1 === DEFINITION_LOADING) return DEFINITION_LOADING;
  const l2 = await getL2Simplified(token, l1, uCardWords, definitions, fromLang, systemLang, readerConfig);
  const sound = await getSound(token, definitions);
  return `${complexPosToSimplePosLabels(token.pos!, fromLang, systemLang)}: ${l1} ${
    l2 != l1 ? `: ${l2}` : ""
  }: ${sound}`;
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

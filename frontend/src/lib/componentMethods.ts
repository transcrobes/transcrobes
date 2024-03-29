import _ from "lodash";
import { platformHelper } from "../app/createStore";
import { DataManager } from "../data/types";
import type { BackgroundWorkerManager } from "../extension/backgroundfn";
import { soundWithSeparators } from "./funclib";
import { affixCleaned, bestGuess, cleanedSound, filterKnown, isFakeL1, toSimplePos } from "./libMethods";
import {
  ACTIVITY_DEBOUNCE,
  ActivitySource,
  ActivityType,
  AnyTreebankPosType,
  BOOCROBES_HEADER_HEIGHT,
  DEFINITION_LOADING,
  DefinitionsState,
  DefinitionState,
  DefinitionType,
  EventCoordinates,
  InputLanguage,
  KnownWords,
  PopupPosition,
  ReaderState,
  RecentSentencesType,
  REMOVABLE_ADVERB_SUFFIXES,
  REMOVABLE_NOUN_SUFFIXES,
  REMOVABLE_VERB_COMPLEMENTS,
  SentenceType,
  SerialisableStringSet,
  StreamDetails,
  STREAMER_DETAILS,
  Subtitle,
  SupportedStreamer,
  SystemLanguage,
  TokenType,
  USER_STATS_MODE,
} from "./types";

const NUMBER_POS = new Set<AnyTreebankPosType>(["OD", "NT", "CD"]);

export async function getNetflixData(proxy: BackgroundWorkerManager, fromLang: InputLanguage, url: string) {
  const urlMatch = url.match(STREAMER_DETAILS.netflix.ui);
  const streamerId = parseInt(urlMatch?.[2] || "");
  const canonicalUrl = "https://" + urlMatch?.[1]!;
  if (!streamerId) return { error: "screens.extension.streamer.no_id" };
  const dataUrl = `https://www.netflix.com/nq/website/memberapi/va7b420b8/metadata?movieid=${streamerId}&_=${Date.now()}`;
  const dataResp = await fetch(dataUrl, { credentials: "include" }); // does need credentials
  if (!dataResp.ok) {
    console.warn("Bad dataResp", dataResp);
    return { error: "screens.extension.streamer.no_data" };
  }

  const netflix = await dataResp.json();
  const { data: nfData } = await proxy.getNetflixData();
  if (!nfData.subs?.[streamerId]) {
    console.warn("Bad subsUrl", nfData);
    return { error: "screens.extension.streamer.no_available_subs" };
  }
  const subtitles = await Promise.all(
    nfData.subs[streamerId].map((subsUrl) =>
      fetch(subsUrl.url)
        .then((x) => {
          if (x.ok) {
            return x.text();
          }
          return "";
        })
        .then((content) => {
          return { lang: fromLang, url: subsUrl.url, content } as Subtitle;
        }),
    ),
  );
  const showTitle = netflix.video?.title?.toString();
  const showId = netflix.video?.id?.toString();
  let curEpisode: any = null;
  let curSeason: any = null;
  let firstSeason: any = null;
  const availableSeasons = netflix.video?.seasons || [];
  for (const season of availableSeasons) {
    if (season.seq === 1) {
      firstSeason = season;
    }
    for (const episode of season.episodes) {
      if (episode.id === streamerId) {
        curEpisode = episode;
        curSeason = season;
      }
    }
  }

  const duration = parseInt(curEpisode?.runtime || netflix.video?.runtime || "0");
  const year = firstSeason?.year || netflix.video?.year || 0;
  const episode = parseInt(curEpisode?.seq?.toString() || "0") || undefined;
  const episodeTitle = curEpisode?.title?.toString();
  const category = netflix.video.type === "show" ? "series" : netflix.video.type === "movie" ? "movie" : "unknown";
  const streamDets: StreamDetails = {
    streamer: "netflix",
    streamerId: streamerId.toString(),
    canonicalUrl,
    duration,
    seasonTitle: curSeason?.longName || curSeason?.shortName,
    seasonShortName: curSeason?.shortName,
    seasonId: curSeason?.id?.toString(),
    streamType: "full", // can this be something else?
    episode,
    episodeTitle,
    seasonNumber: curSeason?.seq,
    seasonYear: curSeason?.year,
    category,
    showTitle,
    showId,
    // country,
    language: nfData.language,
    year,
    // showGenre,
    subtitles,
  };
  return { data: streamDets };
}

export async function getWord(lemma: string): Promise<DefinitionState | null> {
  return await platformHelper.getWordFromDBs(lemma);
}

export async function syncDefs(baseUrl: string): Promise<void> {
  platformHelper.forceDefinitionsSync(baseUrl);
}

export function getStreamerVideoElement(document: Document, streamer: SupportedStreamer) {
  let wrapper: HTMLDivElement | undefined = undefined;
  switch (streamer) {
    case "youku":
      wrapper = document.getElementById("ykPlayer") as HTMLDivElement;
      break;
    case "netflix":
      // there might be a better div, like <div id="{the actual video id}"...
      wrapper = document.getElementsByClassName("watch-video")[0] as HTMLDivElement;
      break;
  }
  if (wrapper) {
    return wrapper.getElementsByTagName("video")[0];
  }
  return undefined;
}

export async function getDefinitionsForToken(token: TokenType, definitions: DefinitionsState) {
  let defIds: string[] = [];
  let defs: DefinitionState[] = [];
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
  return defs.length > 0 ? defs : [await getWord(token.l)];
}

export async function getL1(
  token: TokenType,
  definitions: DefinitionsState,
  fromLang: InputLanguage,
  toLang: SystemLanguage,
  readerConfig: ReaderState,
  defaultL1: string,
): Promise<string> {
  // FIXME: just doing affixCleaned here is a bit of a hack. It would probably be better to not put rubbish in the
  // first place... so do this in the Python...
  if (
    defaultL1 &&
    !readerConfig.strictProviderOrdering &&
    affixCleaned(defaultL1) === defaultL1 &&
    !(
      token.id &&
      token.id in definitions &&
      isFakeL1(cleanedSound(definitions[token.id], fromLang), defaultL1, fromLang, false)
    )
  ) {
    return defaultL1;
  }
  let gloss = defaultL1;
  const defs = (await getDefinitionsForToken(token, definitions)).filter((x) => x) as DefinitionState[];
  if (defs[0] && defs[0].providerTranslations) {
    gloss = bestGuess(token, defs, fromLang, toLang, readerConfig);
  } else {
    gloss = DEFINITION_LOADING;
  }

  return gloss || defaultL1;
}

export async function getSound(
  token: TokenType,
  definitions: DefinitionsState,
  fromLang: InputLanguage,
): Promise<string[]> {
  if (token.p) return token.p;
  if (token.id && definitions[token.id]) {
    return cleanedSound(definitions[token.id], fromLang);
  } else {
    const w = await getWord(token.l);
    return w ? cleanedSound(w, fromLang) : [];
  }
}

export async function getNormalGloss(
  token: TokenType,
  readerConfig: ReaderState,
  uCardWords: Partial<KnownWords>,
  definitions: DefinitionsState,
  fromLang: InputLanguage,
  toLang: SystemLanguage,
): Promise<string> {
  const { glossing } = readerConfig;
  // FIXME: decide whether to forget about the python bg...
  let gloss = token.bg ? token.bg.split(",")[0].split(";")[0] : "";
  if (glossing == USER_STATS_MODE.L1) {
    gloss = await getL1(token, definitions, fromLang, toLang, readerConfig, gloss);
  } else if (glossing == USER_STATS_MODE.L2_SIMPLIFIED) {
    gloss = await getL2Simplified(token, gloss, uCardWords, definitions, fromLang, toLang, readerConfig);
  } else if (glossing == USER_STATS_MODE.TRANSLITERATION) {
    gloss = (await getSound(token, definitions, fromLang))
      .map((sound, i) => soundWithSeparators(sound, i, fromLang))
      .join("");
  } else if (glossing == USER_STATS_MODE.TRANSLITERATION_L1) {
    gloss = `${(await getSound(token, definitions, fromLang))
      .map((sound, i) => soundWithSeparators(sound, i, fromLang))
      .join("")}: ${await getL1(token, definitions, fromLang, toLang, readerConfig, gloss)}`;
  }
  return gloss;
}

export async function getTranslation(input: SentenceType): Promise<string> {
  return await platformHelper.sentenceTranslation(originalSentenceFromTokens(input.t));
}

export async function getRecentSentences(
  token: TokenType,
  definition: DefinitionType,
): Promise<RecentSentencesType | null> {
  if (!token.pos || !token.id) return null;
  const existingRSents = new Map<string, RecentSentencesType>(await platformHelper.getRecentSentences([definition.id]));
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

export async function getL2Simplified(
  token: TokenType,
  previousGloss: string,
  uCardWords: Partial<KnownWords>,
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
    const defs = (await getDefinitionsForToken(token, definitions)).filter((x) => x) as DefinitionState[];
    if (!defs[0]) return DEFINITION_LOADING;
    // FIXME: should I just be using the first here? why? why not?
    const syns = defs[0].synonyms.filter((x) => toSimplePos(x.posTag, fromLang) === toSimplePos(token.pos!, fromLang));

    let innerGloss: string | undefined;
    if (syns && syns.length > 0) {
      const userSynonyms = filterKnown(uCardWords.knownWordGraphs || {}, syns[0].values);
      if (userSynonyms.length > 0) {
        innerGloss = userSynonyms[0];
      }
    }
    gloss = innerGloss || gloss || bestGuess(token, defs, fromLang, toLang, readerConfig);
  }
  return gloss;
}

export function isNumberToken(pos?: AnyTreebankPosType): boolean {
  return !!pos && NUMBER_POS.has(pos);
}

export function eventCoordinates(event: React.MouseEvent<HTMLElement>): EventCoordinates {
  return {
    eventX: window.frameElement ? event.clientX : event.pageX,
    eventY: window.frameElement ? event.clientY + BOOCROBES_HEADER_HEIGHT : event.pageY,
  };
}

function getActivityUrl(url: string): string {
  if (url.includes("/api/v1/data/content/")) {
    // We are in the iframe, and need to convert the url to the parent url
    const urlObj = new URL(url);
    return `${urlObj.origin}/#/contents/${url.split("/api/v1/data/content/")[1].split("/")[0]}/read`;
  } else {
    return url;
  }
}

export async function submitActivity(
  proxy: DataManager,
  activityType: ActivityType,
  activitySource: ActivitySource,
  url: string,
  sessionId: string,
  getTimestamp: () => number,
) {
  // FIXME: currently disabled
  // const timestamp = getTimestamp();
  // if (!timestamp) throw new Error("No timestamp");
  // const activity = {
  //   id: UUID().toString(),
  //   asessionId: sessionId,
  //   activityType,
  //   activitySource,
  //   url: getActivityUrl(url),
  //   timestamp,
  // } as UserActivityType;
  // await proxy.submitActivityEvent(activity);
}

export function sessionActivityUpdate(proxy: DataManager, sessionId: string) {
  function updateSessionActivity() {
    proxy.refreshSession({
      id: sessionId,
      timestamp: Date.now(),
    });
  }
  let events = ["load", "mousedown", "mousemove", "keydown", "scroll", "touchstart"];
  events.forEach((name) => {
    document.addEventListener(name, _.debounce(updateSessionActivity, ACTIVITY_DEBOUNCE), true);
  });
}

export function positionPopup(
  popupWidth: number,
  eventX: number,
  eventY: number,
  popupParent: HTMLElement,
  isFullscreenVideo?: boolean,
): PopupPosition {
  const position: PopupPosition = {
    overflow: "auto",
    left: "",
    top: "",
    maxHeight: "",
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
  const pTop = eventY + translateDown;
  position.top = `${pTop}px`;
  if (isFullscreenVideo) {
    const maxHeight = popupParent.ownerDocument.documentElement.clientHeight - pTop;
    position.maxHeight = `${maxHeight}px`;
  }
  return position;
}

export function isUnsure(definition?: DefinitionType) {
  return (
    definition &&
    definition.providerTranslations.length > 0 &&
    definition.providerTranslations.flatMap((pt) => (pt.provider !== "fbk" ? pt.posTranslations : [])).length === 0
  );
}

export async function guessBetter(
  defin: DefinitionState,
  lang: SystemLanguage,
  knownCardWordGraphs: SerialisableStringSet,
): Promise<DefinitionType> {
  switch (lang) {
    case "en":
      return defin;
    case "zh-Hans":
      let newDefinition: DefinitionType | null = null;
      let cleanGraph = affixCleaned(defin.graph);
      if (cleanGraph !== defin.graph) {
        newDefinition = await getWord(cleanGraph);
        if (newDefinition && (cleanGraph in knownCardWordGraphs || !isUnsure(newDefinition))) {
          return newDefinition;
        }
      }
      if (!isUnsure(defin)) {
        // we only want to continue from here if we are unsure about the original definition
        return defin;
      }
      if (cleanGraph.length === 4) {
        if (cleanGraph[0] === cleanGraph[1] && cleanGraph[2] === cleanGraph[3]) {
          // 干干净净 -> 干净
          newDefinition = await getWord(cleanGraph[0] + cleanGraph[2]);
        } else if (cleanGraph[0] === cleanGraph[2] && cleanGraph[1] === cleanGraph[3]) {
          // 讨论讨论 -> 讨论
          newDefinition = await getWord(cleanGraph[0] + cleanGraph[1]);
        }
        if (newDefinition && !isUnsure(newDefinition)) {
          return newDefinition;
        }
      } else if (cleanGraph.length === 2 && cleanGraph[0] === cleanGraph[1]) {
        // 看看 -> 看
        // double character that isn't in the dictionary - it's basically just the same word twice, not a new word...
        return (await getWord(cleanGraph[0])) || defin;
      } else if (cleanGraph.length === 3 && cleanGraph[1] === "一" && cleanGraph[0] === cleanGraph[2]) {
        // 看一看 -> 看
        return (await getWord(cleanGraph[0])) || defin;
      } else if (cleanGraph.length === 3 && cleanGraph[0] === cleanGraph[1]) {
        // 见见面 -> 见面
        newDefinition = await getWord(cleanGraph[1] + cleanGraph[2]);
        if (newDefinition && !isUnsure(newDefinition)) {
          return newDefinition;
        }
      }

      // this is maybe a bit dangerous... but we are unsure anyway, so why not!
      // see https://resources.allsetlearning.com/chinese/grammar/Complement#Summary_of_complement_types
      if (
        cleanGraph.length > 1 &&
        [...REMOVABLE_NOUN_SUFFIXES, ...REMOVABLE_ADVERB_SUFFIXES, ...REMOVABLE_VERB_COMPLEMENTS].includes(
          cleanGraph.slice(-1),
        )
      ) {
        newDefinition = await getWord(cleanGraph.slice(0, -1));
        if (newDefinition && !isUnsure(newDefinition)) {
          return newDefinition;
        }
      }
      return defin;
  }
}

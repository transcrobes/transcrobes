import Polyglot from "node-polyglot";
import { store } from "../app/createStore";
import { getUserDexie } from "../database/authdb";
import { camelToSnakeCase, getLanguageFromPreferred } from "../lib/funclib";
import * as utils from "../lib/libMethods";
import { fetchPlus } from "../lib/libMethods";
import {
  DEFAULT_RETRIES,
  ExtensionImportMessage,
  NetflixDetails,
  STREAMER_DETAILS,
  StreamDetails,
  UserState,
} from "../lib/types";
import { rxdbDataManager } from "../workers/rxdb/rxdata";
import { sqliteDataManager } from "../workers/sqlite/sqldata";
import ImportPopup from "./ImportPopup?script";
import contentScript from "./content?script";
import { getCacheValue, setCacheValue } from "./lib/modelsCache";
import { getRawYoukuData, getYoukuDataFromRaw } from "./lib/yk";

const messages: {
  getNetflixData: NetflixDetails;
  getYoukuData?: StreamDetails;
  getImportMessage: ExtensionImportMessage;
} = {
  getNetflixData: {
    language: "",
    subs: {},
  },
  getImportMessage: { message: "", status: "ongoing" },
};

let polyglot: Polyglot;

export async function getPolyglot() {
  if (polyglot) return polyglot;
  const langs = await chrome.i18n.getAcceptLanguages();
  polyglot = new Polyglot({
    phrases: utils.getMessages(getLanguageFromPreferred(langs)),
  });
  return polyglot;
}

export async function runMain(tab: chrome.tabs.Tab, userData: UserState) {
  console.log("Starting to run main");
  if (tab.url?.match(STREAMER_DETAILS.netflix.ui)) {
    const urls = await chrome.scripting.executeScript({
      target: { tabId: tab.id! },
      func: (lang) => {
        if (!localStorage.getItem("TCLang")) {
          localStorage.setItem("TCLang", lang);
          location.reload(); // reload so the content_script has a value from the beginning
        }

        // @ts-ignore
        const subs = window.nftts;
        // @ts-ignore
        const language = window.netflix?.reactContext?.models?.geo?.data?.locale?.id?.split("-")[0];
        return {
          subs,
          language,
        };
      },
      args: [userData.user.fromLang],
      world: "MAIN",
    });
    // safari doesn't return InjectionResults, it returns the values directly
    messages.getNetflixData = urls[0]?.result || urls[0];
  } else if (tab.url?.match(STREAMER_DETAILS.youku.ui)) {
    const raw = await chrome.scripting.executeScript({
      target: { tabId: tab.id! },
      func: getRawYoukuData,
      world: "MAIN",
    });
    ({ data: messages.getYoukuData } = getYoukuDataFromRaw(raw[0]?.result || raw[0]));
  }
  if (tab.url?.match(STREAMER_DETAILS.netflix.ui) || tab.url?.match(STREAMER_DETAILS.youku.ui)) {
    const contentIdAutoPlay = await getCacheValue(utils.streamContentIdCacheKey(tab.url));
    if (contentIdAutoPlay) {
      setCacheValue(utils.streamContentIdCacheKey(tab.url), {
        cachedDate: Date.now(),
        value: `${contentIdAutoPlay.value.split(":")[0]}:true`,
      });
    }
  }
  chrome.scripting.executeScript({
    target: { tabId: tab.id!, allFrames: false },
    files: [contentScript],
  });
}

async function pushFile(url: string, afile: Blob, filename: string): Promise<Response> {
  const apiEndPoint = new URL("/api/v1/enrich/import_file", url).href;
  const fd = new FormData();
  fd.append("afile", afile);
  fd.append("filename", filename);
  return await utils.fetchPlusResponse(apiEndPoint, fd);
}

export async function runImportEpub(item: chrome.contextMenus.OnClickData, tab?: chrome.tabs.Tab) {
  const userData = await getUserDexie();
  if (!userData.username || !userData.password || !userData.baseUrl) {
    chrome.runtime.openOptionsPage(() => console.debug("User not initialised"));
    return;
  }
  messages.getImportMessage = {
    message: (await getPolyglot()).t("screens.extension.import.checking", { linkUrl: item?.linkUrl || "" }),
    status: "ongoing",
  };
  if (!tab?.id) return;

  chrome.scripting.executeScript({
    target: { tabId: tab.id, allFrames: false },
    files: [ImportPopup],
  });
  let message = "screens.extension.import.link_error";
  let destUrl = "";
  const linkUrl = item?.linkUrl || "";
  let status: "ongoing" | "error" | "finished" = "error";
  if (linkUrl) {
    const resp = await utils.fetchPlusResponse(linkUrl);
    destUrl = resp.url;
    if (resp.ok && destUrl) {
      if (destUrl.endsWith(".epub")) {
        const bl = await resp.blob();
        if (["application/epub+zip", "application/epub"].includes(bl.type)) {
          messages.getImportMessage = {
            message: (await getPolyglot()).t("screens.extension.import.sending", { linkUrl, destUrl }),
            status: "ongoing",
          };
          // FIXME: this is a bit of a hack, we should NOT be using the db from the background script

          // const [ldb] = await loadDb({ type: "syncDB", source: "background" }, self, () => {});
          // const filename = await createEpubImportFromURL(ldb, destUrl, item.selectionText || "");
          // this doesn't actually work at the moment...
          // replStates.get("imports")!.reSync();
          // const result = await pushFile(userData.baseUrl, bl, filename);
          // if (result.ok) {
          //   message = "screens.extension.import.started";
          //   status = "finished";
          // } else {
          //   console.error(result);
          // }
        }
      }
    }
  }
  messages.getImportMessage = {
    message: (await getPolyglot()).t(message, { linkUrl, destUrl }),
    status,
  };
}

async function removeStreamAutoPlay(url: string) {
  const cacheKey = utils.streamContentIdCacheKey(url);
  if (!cacheKey) {
    return false;
  } else {
    const contentIdAutoPlay = await getCacheValue(cacheKey);
    const contentId = contentIdAutoPlay?.value?.split(":")[0];
    const autoPlay = contentIdAutoPlay?.value?.split(":")[1];
    if (autoPlay === "true") {
      // don't need to remove if it's already false
      setCacheValue(cacheKey, { cachedDate: Date.now(), value: `${contentId}:false` });
    }
    return true;
  }
}
async function serverGet({ url, isText, retries }: { url: string; isText?: boolean; retries?: number }) {
  const cachedValue = await getCacheValue(url);
  if (cachedValue && cachedValue.value) {
    return { data: cachedValue };
  } else {
    try {
      const result = await utils.fetchPlusResponse(
        new URL(url, store.getState().userData.baseUrl),
        undefined,
        retries,
        false,
        isText ? "text" : "json",
      );
      if (result.ok) {
        const res = isText ? result.text() : result.json();
        const data = await res;
        setCacheValue(url, data);
        return { data };
      } else {
        return { error: result.statusText };
      }
    } catch (e) {
      return { error: e };
    }
  }
}
async function enrichText(text: string): Promise<[any, string]> {
  try {
    const parse = await utils.fetchPlus(
      new URL("/api/v1/enrich/enrich_json", store.getState().userData.baseUrl),
      JSON.stringify({ data: text }),
      DEFAULT_RETRIES,
    );
    return [parse, text];
  } catch (e: any) {
    return e;
  }
}

async function streamingTitleSearch(sd: StreamDetails) {
  const converted: any = {};
  for (const [key, value] of Object.entries(sd)) {
    converted[camelToSnakeCase(key)] = value;
  }
  try {
    const result = await utils.fetchPlusResponse(
      new URL("/api/v1/enrich/streaming_title_search", store.getState().userData.baseUrl),
      JSON.stringify(converted),
    );
    if (result.ok) {
      const data: { content_ids: string[] } = await result.json();
      setCacheValue(utils.streamContentIdCacheKey(sd.canonicalUrl), {
        cachedDate: Date.now(),
        value: `${data.content_ids[0]}:true`,
      });
      return { data };
    } else {
      return { error: result.statusText };
    }
  } catch (e: any) {
    return e;
  }
}

async function precachePublications(publications) {
  console.warn("Noop, why am I being called in the background?");
}

async function sentenceTranslation(text: string) {
  return await fetchPlus(
    new URL("/api/v1/enrich/translate", store.getState().userData.baseUrl),
    JSON.stringify({ data: text }),
    DEFAULT_RETRIES,
  );
}

async function getNetflixPlayerError(value?: { tabId: number }) {
  if (!value?.tabId) {
    throw new Error("No tabId provided");
  }
  const success = await chrome.scripting.executeScript({
    target: { tabId: value.tabId },
    func: () => {
      const playManager: any = (window as any).netflix?.appContext?.state?.playerApp?.getAPI?.()?.videoPlayer;
      const player = playManager?.getVideoPlayerBySessionId(playManager.getAllPlayerSessionIds()?.[0]);
      const error = player?.getError();
      console.debug("Getting nf error", error);
      if (player) {
        return error;
      } else {
        console.warn("Could not find player to get error from");
      }
      return false;
    },
    world: "MAIN",
  });
  return success[0]?.result || success[0];
}

async function streamerAutoPlayUrl(valueAndTabId: { value: string; tabId?: number }) {
  if (!valueAndTabId.tabId) {
    throw new Error("No tabId provided");
  }
  const cacheKey = utils.streamContentIdCacheKey(valueAndTabId.value);
  const contentIdAutoPlay = await getCacheValue(cacheKey);
  console.debug("Found cache value", contentIdAutoPlay);
  const autoPlay = contentIdAutoPlay?.value?.split(":")[1];
  if (autoPlay === "true" && valueAndTabId.tabId) {
    console.log("Executing scriptPath");
    await chrome.scripting.executeScript({
      target: { tabId: valueAndTabId.tabId, allFrames: false },
      files: [contentScript],
    });
  } else {
    console.debug("Not executing scriptPath", valueAndTabId);
  }
}

async function seekNetflix(valueAndTabId: { value: number; tabId?: number }) {
  if (!valueAndTabId.tabId) {
    throw new Error("No tabId provided");
  }
  const success = await chrome.scripting.executeScript({
    target: { tabId: valueAndTabId.tabId },
    func: (timestamp) => {
      const playManager: any = (window as any).netflix?.appContext?.state?.playerApp?.getAPI?.()?.videoPlayer;
      const player = playManager?.getVideoPlayerBySessionId(playManager.getAllPlayerSessionIds()?.[0]);
      console.debug("Seeking nf to", player?.getCurrentTime, timestamp, timestamp * 1000);
      if (player?.getCurrentTime) {
        player.seek(timestamp * 1000); // convert to ms
        return true;
      } else {
        console.warn("Could not find player to seek on", timestamp * 1000);
      }
      return false;
    },
    args: [valueAndTabId.value],
    world: "MAIN",
  });
  return success[0]?.result || success[0];
}

async function getImportMessage() {
  return { data: messages.getImportMessage };
}
async function getYoukuData() {
  return { data: messages.getYoukuData };
}
async function getNetflixData() {
  return { data: messages.getNetflixData };
}
async function getUser() {
  return await getUserDexie();
}
async function showOptions() {
  chrome.runtime.openOptionsPage(() => console.debug("Show options"));
}

export const backgroundWorkerManager = {
  precachePublications,
  sentenceTranslation,
  showOptions,
  getImportMessage,
  getYoukuData,
  getNetflixData,
  getUser,
  removeStreamAutoPlay,
  getCacheValue,
  serverGet,
  enrichText,
  streamingTitleSearch,
};

export const backgroundWorkerTabManager = {
  getNetflixPlayerError,
  streamerAutoPlayUrl,
  seekNetflix,
};

export const backgroundWorkerDataManager = {
  ...rxdbDataManager,
  ...sqliteDataManager,
  ...backgroundWorkerManager,
  ...backgroundWorkerTabManager,
};

export type BackgroundWorkerManager = typeof backgroundWorkerManager;
export type BackgroundWorkerTabManager = typeof backgroundWorkerTabManager;

export type BackgroundWorkerManagerMethods = keyof typeof backgroundWorkerManager;
export const backgroundWorkerManagerKeys = Object.keys(backgroundWorkerManager) as BackgroundWorkerManagerMethods[];

export type BackgroundWorkerTabManagerMethods = keyof typeof backgroundWorkerTabManager;
export const backgroundWorkerTabManagerKeys = Object.keys(
  backgroundWorkerTabManager,
) as BackgroundWorkerTabManagerMethods[];

export type BackgroundWorkerDataManager = typeof backgroundWorkerDataManager;

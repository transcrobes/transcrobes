import { HistogramGeneratorNumber } from "d3-array";
import dayjs from "dayjs";
import LZString from "lz-string";
import { HslColor } from "react-colorful";
import {
  FirstSuccess,
  HistoData,
  KeyedModels,
  PosSentences,
  PythonCounter,
  RecentSentencesType,
  RepetrobesActivityConfigType,
  SentenceType,
} from "./types";

export function hslToHex({ h, s, l }: HslColor): string {
  l /= 100;
  const a = (s * Math.min(l, 1 - l)) / 100;
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color)
      .toString(16)
      .padStart(2, "0"); // convert to Hex and prefix "0" if needed
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

export function UUID(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

export function handleBadResponse(url: string, response: Response): void {
  if (!response.ok) {
    const message = `Bad response status for: ${url}. Status: ${response.status}`;
    console.warn(message);
    throw new Error(message);
  }
}

export function getContentBaseURL(contentId: string): string {
  return `/api/v1/data/content/${contentId}`;
}

export function getSubsURL(contentId: string): string {
  return `${getContentBaseURL(contentId)}/subtitles.vtt`;
}

export function getManifestURL(contentId: string): string {
  return `${getContentBaseURL(contentId)}/manifest.json`;
}
export function recentSentencesFromLZ(
  wordId: string,
  lzContent: string,
): RecentSentencesType | null {
  const uncompress = LZString.decompressFromUTF16(lzContent);
  return uncompress ? { id: wordId, posSentences: JSON.parse(uncompress) as PosSentences } : null;
}

export function validInt(value: any, minValue?: number, maxValue?: number): boolean {
  return (
    !isNaN(value) &&
    typeof value === "number" &&
    !(typeof minValue !== "undefined" && value < minValue) &&
    !(typeof maxValue !== "undefined" && value > maxValue)
  );
}

export function configIsUsable(activityConfig: RepetrobesActivityConfigType): boolean {
  return (
    activityConfig.wordLists.length > 0 &&
    activityConfig.activeCardTypes.filter((ct) => ct.selected).length > 0 &&
    !isNaN(activityConfig.dayStartsHour) &&
    !isNaN(activityConfig.badReviewWaitSecs) &&
    !isNaN(activityConfig.maxNew) &&
    !isNaN(activityConfig.maxRevisions) &&
    typeof activityConfig.dayStartsHour === "number" &&
    typeof activityConfig.badReviewWaitSecs === "number" &&
    typeof activityConfig.maxNew === "number" &&
    typeof activityConfig.maxRevisions === "number"
  );
}

export function wordIdsFromModels(models: KeyedModels): Set<string> {
  const uniqueIds = new Set<string>();
  [...Object.entries(models).values()].map((model) => {
    model[1].s.map((s) =>
      s.t.map((t) => {
        if (t.id) uniqueIds.add(t.id.toString());
      }),
    );
  });
  return uniqueIds;
}

export function toggleFullscreen(doc: Document, videoWrapper: HTMLElement): void {
  if (doc.fullscreenElement) {
    exitFullscreen(doc);
  } else {
    launchFullscreen(videoWrapper);
  }
}

// Find the right method, call on correct element
function launchFullscreen(element: HTMLElement): void {
  if (element.requestFullscreen) {
    element.requestFullscreen();
  }
}

function exitFullscreen(doc: Document): void {
  if (doc.exitFullscreen) {
    doc.exitFullscreen();
  }
}

function getVoices(): Promise<SpeechSynthesisVoice[]> {
  return new Promise((resolve) => {
    let voices = speechSynthesis.getVoices();
    if (voices.length) {
      resolve(voices);
      return;
    }
    speechSynthesis.onvoiceschanged = () => {
      voices = speechSynthesis.getVoices();
      resolve(voices);
    };
  });
}

export function say(text: string, voice?: SpeechSynthesisVoice, lang = "zh-CN"): void {
  const synth = window.speechSynthesis;
  if (voice && voice.lang !== lang) {
    throw new Error("The language of the voice and lang must be the same");
  }
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang;
  if (voice) {
    utterance.voice = voice;
    synth.speak(utterance);
  } else {
    getVoices().then((voices) => {
      utterance.voice =
        voices.filter((x) => x.lang === lang && !x.localService)[0] ||
        voices.filter((x) => x.lang === lang)[0];
      synth.speak(utterance);
    });
  }
}

export function onError(e: string): void {
  console.error(e);
}

type TreeWalkerMethods = {
  inspect: (n: Node) => boolean;
  collect: (n: Node) => boolean;
};

export function textNodes(node: HTMLElement): Node[] {
  return walkNodeTree(node, {
    inspect: (n: Node) => !["STYLE", "SCRIPT"].includes(n.nodeName),
    collect: (n: Node) => n.nodeType === 3 && !!n.nodeValue && !!n.nodeValue.match(/\S/),
    //callback: n => console.log(n.nodeName, n),
  });
}

function walkNodeTree(root: HTMLElement, options: TreeWalkerMethods) {
  options = options || {};
  const inspect: (n: Node) => boolean = options.inspect || ((_n) => true);
  const collect: (n: Node) => boolean = options.collect || ((_n) => true);
  const walker = root.ownerDocument.createTreeWalker(root, NodeFilter.SHOW_ALL, {
    acceptNode: function (node) {
      if (!inspect(node)) {
        return NodeFilter.FILTER_REJECT;
      }
      if (!collect(node)) {
        return NodeFilter.FILTER_SKIP;
      }
      return NodeFilter.FILTER_ACCEPT;
    },
  });

  const nodes = [];
  let n;
  while ((n = walker.nextNode())) {
    // options.callback && options.callback(n);
    nodes.push(n);
  }

  return nodes;
}

export function pythonCounter(value: Iterable<any>): PythonCounter {
  const array = Array.isArray(value) ? value : Array.from(value);
  const count: PythonCounter = {};
  array.forEach((val) => (count[val] = (count[val] || 0) + 1));
  return count;
}

// FIXME: should probably be some sort of pattern, not just string
export function parseJwt(token: string): any {
  // TODO: this will apparently not do unicode properly. For the moment we don't care.
  const base64Url = token.split(".")[1];
  const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");

  return JSON.parse(atob(base64));
  // return JSON.parse(Buffer.from(base64, "base64"));
}

export function binnedData(
  binFunc: HistogramGeneratorNumber<number, number>,
  thresholds: number[],
  successes: FirstSuccess[],
  total: number,
): HistoData[] {
  const data: HistoData[] = [];
  const successTotals: Map<number, number> = new Map<number, number>();
  for (const success of successes) {
    successTotals.set(
      success.firstSuccess,
      (successTotals.get(success.firstSuccess) || 0) + success.nbOccurrences,
    );
  }
  const rawBins = binFunc([...successTotals.keys()].map((c) => c));
  let temp = 0;
  const binnedRaw = rawBins.map(
    (v: Array<number>) =>
      (temp += v.reduce((prev, next) => prev + (successTotals.get(next) || 0), 0)),
  );

  const binnedPercents = binnedRaw.map((b: number) => (b / total) * 100);
  for (let i = 0; i < thresholds.length; i++) {
    data.push({
      name: dayjs(thresholds[i] * 1000).format("YYYY-MM-DD"),
      value: binnedPercents[i],
    });
  }
  return data;
}

export function cleanSentence(sentence: SentenceType): SentenceType {
  for (let i = 0; i < sentence.t.length; i++) {
    delete sentence.t[i].de;
    delete sentence.t[i].style;
  }
  return sentence;
}
